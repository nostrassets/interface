import React, { useState, useEffect, memo, useMemo } from "react";

import wagmiConfig from "config/wagmiConfig";
import { WagmiConfig } from "wagmi";
import useScrollToTop from "lib/useScrollToTop";
import { HashRouter as Router } from "react-router-dom";
import { NostrProvider } from "lib/nostr-react";
import { Buffer } from "buffer";
Buffer.from("anything", "base64");
window.Buffer = Buffer;
import "./App.scss";
import "antd/dist/reset.css";
import Routes from "./Routes";
import SEO from "components/Common/SEO";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { defaultLocale, dynamicActivate } from "lib/i18n";
import { LANGUAGE_LOCALSTORAGE_KEY } from "config/localStorage";
import useAccountInit from "hooks/useAccountInit";
import { Provider as GraphProvider } from "urql";
import { client } from "config/graphqlClient";
import { notification, message } from "antd";
import { useSelector } from "react-redux";
import { useGlobalNostrAssetsEvent } from "hooks/useNostr";
if ("ethereum" in window) {
  window.ethereum.autoRefreshOnNetworkChange = false;
}

const GlobalHooks = () => {
  useAccountInit();
  useGlobalNostrAssetsEvent();
  return null;
};
const GlobalModalInit = () => {
  const [api, contextHolder] = notification.useNotification();
  const [messageApi, messageContextHolder] = message.useMessage();
  useEffect(() => {
    if (api) {
      window._notification = api;
    }
    if (messageApi) {
      window._message = messageApi;
    }
  }, [api, messageApi]);
  return (
    <>
      {contextHolder}
      {messageContextHolder}
    </>
  );
};
function App() {
  useScrollToTop();
  useEffect(() => {
    const defaultLanguage =
      localStorage.getItem(LANGUAGE_LOCALSTORAGE_KEY) || defaultLocale;
    dynamicActivate(defaultLanguage);
  }, []);

  const relayUrls = useSelector(({ basic }) => basic.relayUrls);
  const nostrProviderRelayUrls = useMemo(() => {
    return relayUrls
      .filter((relayUrl) => relayUrl.link === true)
      .map((relayUrl) => relayUrl.address);
  }, [relayUrls]);
  return (
    <WagmiConfig config={wagmiConfig}>
      <I18nProvider i18n={i18n} forceRenderOnLocaleChange={false}>
        <NostrProvider relayUrls={nostrProviderRelayUrls} debug={true}>
          <GraphProvider value={client}>
            <SEO>
              <Router>
                <Routes />
              </Router>
            </SEO>
          </GraphProvider>
          <GlobalHooks />
          <GlobalModalInit />
        </NostrProvider>
      </I18nProvider>
    </WagmiConfig>
  );
}

export default App;
