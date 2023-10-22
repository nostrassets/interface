import { useCallback, useEffect, useState, useRef, useMemo } from "react";
import { NOSTAR_TOKEN_SEND_TO } from 'config/constants.js'
import { useSelector } from "react-redux";
import useNostrPool from "hooks/useNostrPool";
//import { buildPSBT } from 'lib/buildPsbt/buildPsbt'
export const useMintAsset = () => {
  const { execQueryNostrAsync } = useNostrPool();
  const handleCreateAssetAsync = useCallback(
    async ({ encodeAssetData }) => {
      const queryCommand = `create new data ${encodeAssetData}`;
      const ret = await execQueryNostrAsync({
        queryCommand,
        sendToNostrAddress: NOSTAR_TOKEN_SEND_TO,
        isUseLocalRobotToSend: false
      });

      return ret;
    },
    [execQueryNostrAsync]
  );
  const handleUpdateAssetAsync = useCallback(
    async ({ id, encodeAssetData }) => {
      const queryCommand = `create save id ${id} data ${encodeAssetData}`;
      const ret = await execQueryNostrAsync({
        queryCommand,
        sendToNostrAddress: NOSTAR_TOKEN_SEND_TO,
        isUseLocalRobotToSend: false
      });

      return ret;
    },
    [execQueryNostrAsync]
  );
  const handleCreateMintPayAsync = useCallback(
    async ({ id, txId, encodeAssetData }) => {
      const queryCommand = `create pay id ${id} txHash ${txId} data ${encodeAssetData}`;
      const ret = await execQueryNostrAsync({
        queryCommand,
        sendToNostrAddress: NOSTAR_TOKEN_SEND_TO,
        isUseLocalRobotToSend: false
      });

      return ret;
    },
    [execQueryNostrAsync]
  );
  return {
    handleCreateAssetAsync,
    handleUpdateAssetAsync,
    handleCreateMintPayAsync
  };
}
export const useUnisatPay = () => {
  const { account } = useSelector(({ user }) => user);
  const handleUnisatPay = useCallback(async (eventId) => {
    let sendTx = "b7dbf53d576d7cbcb84942186d525c82f1c37f1e1acdd5dc9e7e87f9724abe2b"

    if (!window.unisat) {
      throw new Error('No unisat provider.')
    }
    //TODO
    const networkstr = await window.unisat.getNetwork();
    const publicKey = await window.unisat.getPublicKey();
    const memeList = [eventId]
    const targetList = [{ value: 1000000, address: "tb1pa0w5chlch70lwqkf65szf9lpgpla4du6j5appvc420h04uu0xj0sguvtf5" }]
    //const constructPsbtHex = await buildPSBT(networkstr, publicKey, memeList, targetList)
    const constructPsbtHex = ''
    console.log("🚀 ~ file: useMintAssets.js:67 ~ handleUnisatPay ~ constructPsbtHex:", constructPsbtHex)
    return;
    const signedPsbt = await window.unisat.signPsbt(constructPsbtHex, {
      autoFinalized: true,
      toSignInputs: [
        {
          index: 0,
          address: account
        }
      ]
    });

    if (signedPsbt) {
      sendTx = await window.unisat.pushPsbt(signedPsbt);
    }
    return sendTx
  }, [account])

  return {
    handleUnisatPay
  }
}


