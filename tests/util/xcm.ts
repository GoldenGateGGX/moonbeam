import { u8aToHex, BN } from "@polkadot/util";
import { xxhashAsU8a } from "@polkadot/util-crypto";
import { customWeb3Request } from "./providers";

import { DevTestContext } from "./setup-dev-tests";
import {
  CumulusPalletParachainSystemRelayStateSnapshotMessagingStateSnapshot,
  XcmVersionedXcm,
  XcmV3JunctionNetworkId,
} from "@polkadot/types/lookup";
import { XcmpMessageFormat } from "@polkadot/types/interfaces";
import { PRECOMPILE_XCM_UTILS_ADDRESS } from "../util/constants";
import { web3EthCall } from "../util/providers";
import { getCompiled } from "../util/contracts";

import { AssetMetadata } from "./assets";
import { ethers } from "ethers";

const XCM_UTILS_CONTRACT = getCompiled("precompiles/xcm-utils/XcmUtils");
const XCM_UTILSTRANSACTOR_INTERFACE = new ethers.utils.Interface(XCM_UTILS_CONTRACT.contract.abi);

// Creates and returns the tx that overrides the paraHRMP existence
// This needs to be inserted at every block in which you are willing to test
// state changes
// The reason is that set_validation_data inherent overrides it
export function mockHrmpChannelExistanceTx(
  context: DevTestContext,
  para: Number,
  maxCapacity: Number,
  maxTotalSize: Number,
  maxMessageSize: Number
) {
  // This constructs the relevant state to be inserted
  const relevantMessageState = {
    dmqMqcHead: "0x0000000000000000000000000000000000000000000000000000000000000000",
    relayDispatchQueueSize: [0, 0],
    egressChannels: [
      [
        para,
        {
          maxCapacity,
          maxTotalSize,
          maxMessageSize,
          msgCount: 0,
          totalSize: 0,
          mqcHead: null,
        },
      ],
    ],
    ingressChannels: [
      [
        para,
        {
          maxCapacity,
          maxTotalSize,
          maxMessageSize,
          msgCount: 0,
          totalSize: 0,
          mqcHead: null,
        },
      ],
    ],
  };

  const stateToInsert: CumulusPalletParachainSystemRelayStateSnapshotMessagingStateSnapshot =
    context.polkadotApi.createType(
      "CumulusPalletParachainSystemRelayStateSnapshotMessagingStateSnapshot",
      relevantMessageState
    ) as any;

  // Get keys to modify state
  const module = xxhashAsU8a(new TextEncoder().encode("ParachainSystem"), 128);
  const account_key = xxhashAsU8a(new TextEncoder().encode("RelevantMessagingState"), 128);

  const overallKey = new Uint8Array([...module, ...account_key]);

  return context.polkadotApi.tx.system.setStorage([
    [u8aToHex(overallKey), u8aToHex(stateToInsert.toU8a())],
  ]);
}

export async function registerForeignAsset(
  context: DevTestContext,
  asset: any,
  metadata: AssetMetadata,
  unitsPerSecond?: number,
  numAssetsWeightHint?: number
) {
  unitsPerSecond = unitsPerSecond != null ? unitsPerSecond : 0;
  const {
    result: { events: eventsRegister },
  } = await context.createBlock(
    context.polkadotApi.tx.sudo.sudo(
      context.polkadotApi.tx.assetManager.registerForeignAsset(asset, metadata, new BN(1), true)
    )
  );
  // Look for assetId in events
  const registeredAssetId = eventsRegister
    .find(({ event: { section } }) => section.toString() === "assetManager")
    .event.data[0].toHex()
    .replace(/,/g, "");

  // setAssetUnitsPerSecond
  const {
    result: { events },
  } = await context.createBlock(
    context.polkadotApi.tx.sudo.sudo(
      context.polkadotApi.tx.assetManager.setAssetUnitsPerSecond(
        asset,
        unitsPerSecond,
        numAssetsWeightHint
      )
    )
  );
  // check asset in storage
  const registeredAsset = (
    (await context.polkadotApi.query.assets.asset(registeredAssetId)) as any
  ).unwrap();
  return {
    registeredAssetId,
    events,
    registeredAsset,
  };
}

export function descendOriginFromAddress(context: DevTestContext, address?: string) {
  const originAddress = address != null ? address : "0x0101010101010101010101010101010101010101";
  const derivedMultiLocation = context.polkadotApi.createType(
    "MultiLocation",
    JSON.parse(
      `{\
              "parents": 1,\
              "interior": {\
                "X2": [\
                  { "Parachain": 1 },\
                  { "AccountKey20": \
                    {\
                      "network": "Any",\
                      "key": "${originAddress}"\
                    } \
                  }\
                ]\
              }\
            }`
    )
  );

  const toHash = new Uint8Array([
    ...new Uint8Array([32]),
    ...new TextEncoder().encode("multiloc"),
    ...derivedMultiLocation.toU8a(),
  ]);

  return {
    originAddress,
    descendOriginAddress: u8aToHex(context.polkadotApi.registry.hash(toHash).slice(0, 20)),
  };
}

export function sovereignAccountOfSibling(context: DevTestContext, paraId: number): string {
  return u8aToHex(
    new Uint8Array([
      ...new TextEncoder().encode("sibl"),
      ...context.polkadotApi.createType("u32", paraId).toU8a(),
      ...new Uint8Array(12),
    ])
  );
}

export interface RawXcmMessage {
  type: string;
  payload: any;
  format?: string;
}

export function buildXcmpMessage(context: DevTestContext, message: RawXcmMessage): number[] {
  const format = message.format != null ? message.format : "ConcatenatedVersionedXcm";
  const xcmpFormat: XcmpMessageFormat = context.polkadotApi.createType(
    "XcmpMessageFormat",
    format
  ) as any;
  const receivedMessage: XcmVersionedXcm = context.polkadotApi.createType(
    message.type,
    message.payload
  ) as any;

  return [...xcmpFormat.toU8a(), ...receivedMessage.toU8a()];
}

export async function injectHrmpMessage(
  context: DevTestContext,
  paraId: number,
  message?: RawXcmMessage
) {
  let totalMessage = message != null ? buildXcmpMessage(context, message) : [];
  // Send RPC call to inject XCM message
  await customWeb3Request(context.web3, "xcm_injectHrmpMessage", [paraId, totalMessage]);
}

// Weight a particular message using the xcm utils precompile
export async function weightMessage(context: DevTestContext, message?: XcmVersionedXcm) {
  const result = await web3EthCall(context.web3, {
    to: PRECOMPILE_XCM_UTILS_ADDRESS,
    data: XCM_UTILSTRANSACTOR_INTERFACE.encodeFunctionData("weightMessage", [message.toU8a()]),
  });
  return BigInt(result.result);
}

export async function injectHrmpMessageAndSeal(
  context: DevTestContext,
  paraId: number,
  message?: RawXcmMessage
) {
  await injectHrmpMessage(context, paraId, message);
  // Create a block in which the XCM will be executed
  await context.createBlock();
}

interface XcmFragmentConfig {
  assets: {
    multilocation: {
      parents: number;
      interior: any;
    };
    fungible: bigint;
  }[];
  weight_limit?: BN;
  descend_origin?: string;
  beneficiary?: string;
}

export class XcmFragment {
  config: XcmFragmentConfig;
  instructions: any[];

  constructor(config: XcmFragmentConfig) {
    this.config = config;
    this.instructions = [];
  }

  // Add a `ReserveAssetDeposited` instruction
  reserve_asset_deposited(): this {
    this.instructions.push({
      ReserveAssetDeposited: this.config.assets.map(({ multilocation, fungible }) => {
        return {
          id: {
            Concrete: multilocation,
          },
          fun: { Fungible: fungible },
        };
      }, this),
    });
    return this;
  }

  // Add a `WithdrawAsset` instruction
  withdraw_asset(): this {
    this.instructions.push({
      WithdrawAsset: this.config.assets.map(({ multilocation, fungible }) => {
        return {
          id: {
            Concrete: multilocation,
          },
          fun: { Fungible: fungible },
        };
      }, this),
    });
    return this;
  }

  // Add one or more `BuyExecution` instruction
  // if weight_limit is not set in config, then we put unlimited
  buy_execution(fee_index: number = 0, repeat: bigint = 1n): this {
    const weightLimit =
      this.config.weight_limit != null
        ? { Limited: this.config.weight_limit }
        : { Unlimited: null };
    for (var i = 0; i < repeat; i++) {
      this.instructions.push({
        BuyExecution: {
          fees: {
            id: {
              Concrete: this.config.assets[fee_index].multilocation,
            },
            fun: { Fungible: this.config.assets[fee_index].fungible },
          },
          weightLimit: weightLimit,
        },
      });
    }
    return this;
  }

  // Add a `ClaimAsset` instruction
  claim_asset(index: number = 0): this {
    this.instructions.push({
      ClaimAsset: {
        assets: [
          {
            id: {
              Concrete: this.config.assets[index].multilocation,
            },
            fun: { Fungible: this.config.assets[index].fungible },
          },
        ],
        // Ticket seems to indicate the version of the assets
        ticket: {
          parents: 0,
          interior: { X1: { GeneralIndex: 3 } },
        },
      },
    });
    return this;
  }

  // Add a `ClearOrigin` instruction
  clear_origin(repeat: bigint = 1n): this {
    for (var i = 0; i < repeat; i++) {
      this.instructions.push({ ClearOrigin: null as any });
    }
    return this;
  }

  // Add a `DescendOrigin` instruction
  descend_origin(): this {
    if (this.config.descend_origin != null) {
      this.instructions.push({
        DescendOrigin: {
          X1: {
            AccountKey20: {
              network: "Any",
              key: this.config.descend_origin,
            },
          },
        },
      });
    } else {
      console.warn("!Building a DescendOrigin instruction without a configured descend_origin");
    }
    return this;
  }

  // Add a `DepositAsset` instruction
  deposit_asset(
    max_assets: bigint = 1n,
    network: "Any" | XcmV3JunctionNetworkId["type"] = "Any"
  ): this {
    if (this.config.beneficiary == null) {
      console.warn("!Building a DepositAsset instruction without a configured beneficiary");
    }
    this.instructions.push({
      DepositAsset: {
        assets: { Wild: "All" },
        maxAssets: max_assets,
        beneficiary: {
          parents: 0,
          interior: { X1: { AccountKey20: { network, key: this.config.beneficiary } } },
        },
      },
    });
    return this;
  }

  // Add a `SetErrorHandler` instruction, appending all the nested instructions
  set_error_handler_with(callbacks: Function[]): this {
    let error_instructions = [];
    callbacks.forEach((cb) => {
      cb.call(this);
      // As each method in the class pushes to the instruction stack, we pop
      error_instructions.push(this.instructions.pop());
    });
    this.instructions.push({
      SetErrorHandler: error_instructions,
    });
    return this;
  }

  // Add a `SetAppendix` instruction, appending all the nested instructions
  set_appendix_with(callbacks: Function[]): this {
    let appendix_instructions = [];
    callbacks.forEach((cb) => {
      cb.call(this);
      // As each method in the class pushes to the instruction stack, we pop
      appendix_instructions.push(this.instructions.pop());
    });
    this.instructions.push({
      SetAppendix: appendix_instructions,
    });
    return this;
  }

  // Add a `Trap` instruction
  trap(): this {
    this.instructions.push({
      Trap: 0,
    });
    return this;
  }

  // Utility function to support functional style method call chaining bound to `this` context
  with(callback: Function): this {
    return callback.call(this);
  }

  // Pushes the given instruction
  push_any(instruction: any): this {
    this.instructions.push(instruction);
    return this;
  }

  // Returns a V2 fragment payload
  as_v2(): any {
    return {
      V2: this.instructions,
    };
  }

  /// XCM V3 calls
  as_v3(): any {
    return {
      V3: replaceNetworkAny(this.instructions),
    };
  }

  // Add a `BurnAsset` instruction
  burn_asset(amount: bigint = 0n): this {
    this.instructions.push({
      BurnAsset: this.config.assets.map(({ multilocation, fungible }) => {
        return {
          id: {
            Concrete: multilocation,
          },
          fun: { Fungible: amount == 0n ? fungible : amount },
        };
      }, this),
    });
    return this;
  }

  // Add a `ReportHolding` instruction
  report_holding(
    destination: number,
    query_id: number = Math.floor(Math.random() * 1000),
    max_weight: { refTime: bigint; proofSize: bigint } = {
      refTime: 1_000_000_000n,
      proofSize: 1_000_000_000n,
    }
  ): this {
    this.instructions.push({
      ReportHolding: {
        response_info: {
          destination: { parents: 1, interior: { X1: { Parachain: destination } } },
          query_id,
          max_weight,
        },
        assets: { Wild: "All" },
      },
    });
    return this;
  }

  // Add a `ExpectAsset` instruction
  expect_asset(): this {
    this.instructions.push({
      ExpectAsset: this.config.assets.map(({ multilocation, fungible }) => {
        return {
          id: {
            Concrete: multilocation,
          },
          fun: { Fungible: fungible },
        };
      }, this),
    });
    return this;
  }

  // Add a `ExpectOrigin` instruction
  expect_origin(index: number = 0): this {
    this.instructions.push({
      ExpectOrigin: this.config.assets[index].multilocation,
    });
    return this;
  }

  // Add a `ExpectError` instruction
  expect_error(index: number = 0, error: string = "Unimplemented"): this {
    this.instructions.push({
      ExpectError: { index, error },
    });
    return this;
  }

  // Add a `ExpectTransactStatus` instruction
  expect_transact_status(status: any = "Success"): this {
    this.instructions.push({
      ExpectTransactStatus: status,
    });
    return this;
  }

  // Add a `QueryPallet` instruction
  query_pallet(
    destination: number,
    query_id: number = Math.floor(Math.random() * 1000),
    module_name: number[] = [1, 2, 3],
    max_weight: { refTime: bigint; proofSize: bigint } = {
      refTime: 1_000_000_000n,
      proofSize: 1_000_000_000n,
    }
  ): this {
    this.instructions.push({
      QueryPallet: {
        module_name: module_name,
        response_info: {
          detination: { parents: 1, interior: { X1: { Parachain: destination } } },
          query_id,
          max_weight,
        },
      },
    });
    return this;
  }

  // Add a `ExpectPallet` instruction
  expect_pallet(
    index: number = 0,
    name: number[] = [1, 2, 3],
    module_name: number[] = [1, 2, 3],
    crate_major: number = 4,
    min_crate_minor: number = 0
  ): this {
    this.instructions.push({
      ExpectPallet: {
        index,
        name,
        module_name,
        crate_major,
        min_crate_minor,
      },
    });
    return this;
  }

  // Add a `ReportTransactStatus` instruction
  report_transact_status(
    destination: number,
    query_id: number = Math.floor(Math.random() * 1000),
    max_weight: { refTime: bigint; proofSize: bigint } = {
      refTime: 1_000_000_000n,
      proofSize: 1_000_000_000n,
    }
  ): this {
    this.instructions.push({
      ReportTransactStatus: {
        destination: { parents: 1, interior: { X1: { Parachain: destination } } },
        query_id,
        max_weight,
      },
    });
    return this;
  }

  // Add a `ClearTransactStatus` instruction
  clear_transact_status(): this {
    this.instructions.push({
      ClearTransactStatus: null as any,
    });
    return this;
  }

  // Add a `UniversalOrigin` instruction
  universal_origin(junction: any): this {
    this.instructions.push({
      UniversalOrigin: { junction },
    });
    return this;
  }

  // Add a `ExportMessage` instruction
  export_message(
    network: "Any" | XcmV3JunctionNetworkId["type"] = "Any",
    destination: any,
    xcm: Function[]
  ): this {
    let exported_instructions = [];
    xcm.forEach((cb) => {
      cb.call(this);
      // As each method in the class pushes to the instruction stack, we pop
      exported_instructions.push(this.instructions.pop());
    });
    this.instructions.push({
      ExportMessage: {
        network,
        destination,
        xcm: exported_instructions,
      },
    });
    return this;
  }

  // Add a `LockAsset` instruction
  lock_asset(index: number = 0, destination: number): this {
    this.instructions.push({
      LockAsset: {
        asset: {
          id: {
            Concrete: this.config.assets[index].multilocation,
          },
          fun: {
            Fungible: this.config.assets[index].fungible,
          },
        },
        unlocker: { parents: 1, interior: { X1: { Parachain: destination } } },
      },
    });
    return this;
  }

  // Add a `UnlockAsset` instruction
  unlock_asset(index: number = 0): this {
    this.instructions.push({
      UnlockAsset: {
        asset: {
          id: {
            Concrete: this.config.assets[index].multilocation,
          },
          fun: {
            Fungible: this.config.assets[index].fungible,
          },
        },
        target: this.config.assets[index].multilocation,
      },
    });
    return this;
  }

  // Add a `NoteUnlockable` instruction
  note_unlockable(index: number = 0): this {
    this.instructions.push({
      NoteUnlockable: {
        asset: {
          id: {
            Concrete: this.config.assets[index].multilocation,
          },
          fun: {
            Fungible: this.config.assets[index].fungible,
          },
        },
        owner: this.config.assets[index].multilocation,
      },
    });
    return this;
  }

  // Add a `RequestUnlock` instruction
  request_unlock(index: number = 0): this {
    this.instructions.push({
      RequestUnlock: {
        asset: {
          id: {
            Concrete: this.config.assets[index].multilocation,
          },
          fun: {
            Fungible: this.config.assets[index].fungible,
          },
        },
        locker: this.config.assets[index].multilocation,
      },
    });
    return this;
  }

  // Add a `SetFeesMode` instruction
  set_fees_mode(jit_withdraw: boolean = true): this {
    this.instructions.push({
      SetFeesMode: { jit_withdraw },
    });
    return this;
  }

  // Add a `SetTopic` instruction
  set_topic(topic: number[]): this {
    this.instructions.push({
      SetTopic: { topic },
    });
    return this;
  }

  // Add a `ClearTopic` instruction
  clear_topic(): this {
    this.instructions.push({
      ClearTopic: null as any,
    });
    return this;
  }

  // Add a `AliasOrigin` instruction
  alias_origin(destination: number): this {
    this.instructions.push({
      AliasOrigin: {
        parents: 1,
        interior: { X1: { Parachain: destination } },
      },
    });
    return this;
  }

  // Add a `UnpaidExecution` instruction
  unpaid_execution(weight_limit: any, destination: number): this {
    this.instructions.push({
      UnpaidExecution: {
        weight_limit,
        check_origin: { X1: { Parachain: destination } },
      },
    });
    return this;
  }

  // Overrides the weight limit of the first buyExeuction encountered
  // with the measured weight
  async override_weight(context: DevTestContext): Promise<this> {
    const message: XcmVersionedXcm = context.polkadotApi.createType(
      "XcmVersionedXcm",
      this.as_v2()
    ) as any;

    const instructions = message.asV2;
    for (var i = 0; i < instructions.length; i++) {
      if (instructions[i].isBuyExecution == true) {
        let newWeight = await weightMessage(context, message);
        this.instructions[i] = {
          BuyExecution: {
            fees: instructions[i].asBuyExecution.fees,
            weightLimit: { Limited: newWeight },
          },
        };
        break;
      }
    }
    return this;
  }
}

function replaceNetworkAny(obj: AnyObject | Array<AnyObject>) {
  if (Array.isArray(obj)) {
    return obj.map((item) => replaceNetworkAny(item));
  } else if (typeof obj === "object" && obj !== null) {
    const newObj: AnyObject = {};
    for (const key in obj) {
      if (key === "network" && obj[key] === "Any") {
        newObj[key] = "Ethereum";
      } else {
        newObj[key] = replaceNetworkAny(obj[key]);
      }
    }
    return newObj;
  }
  return obj;
}

type AnyObject = {
  [key: string]: any;
};
