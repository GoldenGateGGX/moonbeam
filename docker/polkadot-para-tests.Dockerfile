# Node for Moonbase Parachains.
#
# Requires to run from repository root and to copy the binary in the build folder (part of the release workflow)

FROM node
LABEL maintainer "alan@purestake.com"
LABEL description="Node image use to run Moonbeam para-tests"

ARG HOST_UID=1001

RUN mv /usr/share/ca* /tmp && \
	rm -rf /usr/share/*  && \
	mv /tmp/ca-certificates /usr/share/ && \
	rm -rf /usr/lib/python* && \
	useradd -m -u $HOST_UID -U -s /bin/sh -d /polkadot polkadot && \
	mkdir -p /polkadot/.local/share/polkadot && \
	chown -R polkadot:polkadot /polkadot && \
	ln -s /polkadot/.local/share/polkadot /data && \
	rm -rf /usr/bin /usr/sbin

USER polkadot

RUN mkdir -p /binaries
COPY --chown=polkadot build/polkadot /binaries/
RUN chmod -R uog+owX /binaries

WORKDIR /polkadot


