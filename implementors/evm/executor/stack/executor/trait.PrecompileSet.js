(function() {var implementors = {
"pallet_evm_precompileset_assets_erc20":[["impl&lt;Runtime, IsLocal, Instance&gt; PrecompileSet for <a class=\"struct\" href=\"pallet_evm_precompileset_assets_erc20/struct.Erc20AssetsPrecompileSet.html\" title=\"struct pallet_evm_precompileset_assets_erc20::Erc20AssetsPrecompileSet\">Erc20AssetsPrecompileSet</a>&lt;Runtime, IsLocal, Instance&gt;<span class=\"where fmt-newline\">where<br>&nbsp;&nbsp;&nbsp;&nbsp;Instance: InstanceToPrefix + 'static,<br>&nbsp;&nbsp;&nbsp;&nbsp;Runtime: Config&lt;Instance&gt; + Config + Config + Config + <a class=\"trait\" href=\"pallet_evm_precompileset_assets_erc20/trait.AccountIdAssetIdConversion.html\" title=\"trait pallet_evm_precompileset_assets_erc20::AccountIdAssetIdConversion\">AccountIdAssetIdConversion</a>&lt;Runtime::AccountId, <a class=\"type\" href=\"pallet_evm_precompileset_assets_erc20/type.AssetIdOf.html\" title=\"type pallet_evm_precompileset_assets_erc20::AssetIdOf\">AssetIdOf</a>&lt;Runtime, Instance&gt;&gt;,<br>&nbsp;&nbsp;&nbsp;&nbsp;Runtime::RuntimeCall: Dispatchable&lt;PostInfo = PostDispatchInfo&gt; + GetDispatchInfo + <a class=\"trait\" href=\"https://doc.rust-lang.org/1.68.2/core/convert/trait.From.html\" title=\"trait core::convert::From\">From</a>&lt;Call&lt;Runtime, Instance&gt;&gt;,<br>&nbsp;&nbsp;&nbsp;&nbsp;&lt;Runtime::RuntimeCall as Dispatchable&gt;::RuntimeOrigin: <a class=\"trait\" href=\"https://doc.rust-lang.org/1.68.2/core/convert/trait.From.html\" title=\"trait core::convert::From\">From</a>&lt;<a class=\"enum\" href=\"https://doc.rust-lang.org/1.68.2/core/option/enum.Option.html\" title=\"enum core::option::Option\">Option</a>&lt;Runtime::AccountId&gt;&gt;,<br>&nbsp;&nbsp;&nbsp;&nbsp;<a class=\"type\" href=\"pallet_evm_precompileset_assets_erc20/type.BalanceOf.html\" title=\"type pallet_evm_precompileset_assets_erc20::BalanceOf\">BalanceOf</a>&lt;Runtime, Instance&gt;: <a class=\"trait\" href=\"https://doc.rust-lang.org/1.68.2/core/convert/trait.TryFrom.html\" title=\"trait core::convert::TryFrom\">TryFrom</a>&lt;U256&gt; + <a class=\"trait\" href=\"https://doc.rust-lang.org/1.68.2/core/convert/trait.Into.html\" title=\"trait core::convert::Into\">Into</a>&lt;U256&gt; + <a class=\"trait\" href=\"precompile_utils/data/trait.EvmData.html\" title=\"trait precompile_utils::data::EvmData\">EvmData</a>,<br>&nbsp;&nbsp;&nbsp;&nbsp;&lt;&lt;Runtime as Config&gt;::RuntimeCall as Dispatchable&gt;::RuntimeOrigin: OriginTrait,<br>&nbsp;&nbsp;&nbsp;&nbsp;IsLocal: Get&lt;<a class=\"primitive\" href=\"https://doc.rust-lang.org/1.68.2/std/primitive.bool.html\">bool</a>&gt;,<br>&nbsp;&nbsp;&nbsp;&nbsp;&lt;Runtime as Config&gt;::Moment: <a class=\"trait\" href=\"https://doc.rust-lang.org/1.68.2/core/convert/trait.Into.html\" title=\"trait core::convert::Into\">Into</a>&lt;U256&gt;,<br>&nbsp;&nbsp;&nbsp;&nbsp;<a class=\"type\" href=\"pallet_evm_precompileset_assets_erc20/type.AssetIdOf.html\" title=\"type pallet_evm_precompileset_assets_erc20::AssetIdOf\">AssetIdOf</a>&lt;Runtime, Instance&gt;: <a class=\"trait\" href=\"https://doc.rust-lang.org/1.68.2/core/fmt/trait.Display.html\" title=\"trait core::fmt::Display\">Display</a>,<br>&nbsp;&nbsp;&nbsp;&nbsp;Runtime::AccountId: <a class=\"trait\" href=\"https://doc.rust-lang.org/1.68.2/core/convert/trait.Into.html\" title=\"trait core::convert::Into\">Into</a>&lt;H160&gt;,</span>"]],
"precompile_utils":[["impl&lt;R:&nbsp;Config, P:&nbsp;<a class=\"trait\" href=\"precompile_utils/precompile_set/trait.PrecompileSetFragment.html\" title=\"trait precompile_utils::precompile_set::PrecompileSetFragment\">PrecompileSetFragment</a>&gt; PrecompileSet for <a class=\"struct\" href=\"precompile_utils/precompile_set/struct.PrecompileSetBuilder.html\" title=\"struct precompile_utils::precompile_set::PrecompileSetBuilder\">PrecompileSetBuilder</a>&lt;R, P&gt;"]]
};if (window.register_implementors) {window.register_implementors(implementors);} else {window.pending_implementors = implementors;}})()