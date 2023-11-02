import "./index.scss";
import { useState, useRef, useMemo, memo, useCallback, useEffect } from "react";
import { Table, Tooltip, Button, message, Spin, Modal } from "antd";
import { t } from "@lingui/macro";
import { useSelector, useDispatch } from "react-redux";
import { nip19 } from "nostr-tools";
import EllipsisMiddle from "components/EllipsisMiddle";
/* import AppNostrHeaderUser from "components/Header/AppNostrHeaderUser"; */
import Transfer from "./comps/Transfer";
import AddressBook from "./comps/AddressBook";
import avatar from "img/avatar.png";
import asset from "img/asset.png";
import { limitDecimals, numberWithCommas } from "lib/numbers";
import BigNumber from "bignumber.js";
import { useSize } from "ahooks";
import { useQueryBalance } from "hooks/useNostrMarket";
import { useHistory } from "react-router-dom";
import { useTokenChangeQuery } from "hooks/graphQuery/useExplore";
import ProModal from "./comps/ProModal";
import { ReactComponent as TransferSvg } from "img/Transfer.svg";
import { ReactComponent as ReceiveSvg } from "img/Receive.svg";
import { ReactComponent as SendSvg } from "img/Send.svg";
import { ReactComponent as AssetSvg } from "img/Asset.svg";
import { ReloadOutlined } from "@ant-design/icons";
import ConnectNostr from "components/Common/ConnectNostr";
import CheckNostrButton from "components/CheckNostrButton";
import useDevice from "hooks/useDevice";
import { setAboutModalVisible } from "store/reducer/modalReducer";
import { QUOTE_ASSET } from "config/constants";
import NoticeModal from "./comps/NoticeModal";
import { convertDollars } from "lib/utils/index";
const ASSET_PLAT_MAP = {
  ETHEREUM: "ETH",
  BRC20: "BTC",
  LIGHTNING: "Lightning",
  TAPROOT: "Taproot"
};
function Account() {
  const { width } = useSize(document.querySelector("body"));
  const device = useDevice();
  const dispatch = useDispatch();
  const [isTransferShow, setIsTransferShow] = useState(false);
  const [isAddressBookShow, setIsAddressBookShow] = useState(false);
  const [detail, setDetail] = useState(null);
  const history = useHistory();
  const { nostrAccount, balanceList, npubNostrAccount } = useSelector(({ user }) => user);
  const { tokenList, quote_pirce } = useSelector(({ market }) => market);
  console.log("tokenList", tokenList);
  const qutoAsset = useMemo(() => {
    return tokenList.find((tokenItem) => tokenItem?.name === QUOTE_ASSET);
  }, [tokenList]);
  const { handleQueryBalance } = useQueryBalance();
  const { list, fetching, reexcuteQuery } = useTokenChangeQuery({});
  const [reloading, setReloading] = useState(false);
  useEffect(() => {
    setInterval(() => {
      reexcuteQuery();
    }, 60000);
    return () => null;
  }, [reexcuteQuery]);
  const handleReloadBalance = useCallback(async () => {
    setReloading(true);
    await handleQueryBalance(npubNostrAccount);
    setReloading(false);
  }, [handleQueryBalance, npubNostrAccount]);
  const totalValue = useMemo(() => {
    let total = 0;
    if (!nostrAccount) {
      return "--";
    }
    if (tokenList?.length) {
      // list.forEach((item) => {
      //   const row = tokenList.find((k) => k?.name == item?.name);
      //   const balance = balanceList?.[item?.name]?.balanceShow;
      //   if (item?.name?.toLowerCase() == QUOTE_ASSET?.toLowerCase()) {
      //     total += BigNumber(balance).toNumber();
      //   } else if (item?.deal_price && row && balance) {
      //     total += BigNumber(item.deal_price).div(qutoAsset?.decimals).div(row?.decimals).times(balance).toNumber();
      //   }
      // });
      tokenList.forEach((item) => {
        const row = list.find((k) => k?.name == item?.name);
        const balance = balanceList?.[item?.name]?.balanceShow || 0;
        if (item?.name?.toLowerCase() == QUOTE_ASSET?.toLowerCase()) {
          total += BigNumber(balance).toNumber();
        } else if (row?.deal_price && row && balance) {
          total += BigNumber(row.deal_price).div(qutoAsset?.decimals).div(row?.decimals).times(balance).toNumber();
        }
      });
    }
    return total;
  }, [nostrAccount, tokenList, qutoAsset?.decimals, list, balanceList]);
  const transferShow = useCallback((row) => {
    setDetail(row);
    setIsTransferShow(true);
  }, []);
  const onHandleRedirect = useCallback(
    (redirectTo) => {
      history.push(`/${redirectTo}`);
    },
    [history]
  );
  const goImportAssets = useCallback(() => {
    dispatch(setAboutModalVisible(true));
  }, [dispatch]);
  const columns = useMemo(() => {
    if (width > 768) {
      return [
        {
          title: t`Asset`,
          dataIndex: "name"
        },
        {
          title: t`Asset ID`,
          dataIndex: "token",
          render(text, row) {
            return text ? (
              <Tooltip
                overlayClassName="token-address-tooltip"
                title={
                  <div>
                    <div>Asset name: {row?.name || "--"}</div>
                    <div>
                      Asset ID:{" "}
                      {row?.token
                        ? row?.token?.substring(0, 10) + "..." + row?.token?.substring(row?.token?.length - 6)
                        : "--"}
                    </div>
                    <div>Total supply: {row?.totalSupply ? numberWithCommas(row?.totalSupply) : "--"}</div>
                  </div>
                }
              >
                <div>
                  <EllipsisMiddle suffixCount={6}>{text}</EllipsisMiddle>
                </div>
              </Tooltip>
            ) : (
              "--"
            );
          }
        },
        {
          title: `Last Price (${qutoAsset?.name?.toLowerCase()})`,
          dataIndex: "name",
          render: (text, row) => {
            if (text == QUOTE_ASSET) {
              return `1`;
            }
            const priceDetail = list.find((item) => item?.name == text);
            const price =
              priceDetail?.deal_price && qutoAsset
                ? BigNumber(priceDetail.deal_price).div(qutoAsset?.decimals).toNumber()
                : "--";
            // return;
            return price != "--" ? (
              <div>
                <div className="color-light">{numberWithCommas(limitDecimals(price, qutoAsset?.reserve || 0))}</div>
                <div className="color-dark">
                  {convertDollars(price, quote_pirce)}
                </div>
              </div>
            ) : (
              "--"
            );
          }
        },
        {
          title: t`Amount`,
          dataIndex: "name",
          render: (text) => {
            const balance = balanceList?.[text]?.balanceShow;
            return balance ? <span className="color-light">{numberWithCommas(balance)}</span> : "0";
          }
        },
        {
          title: `Value (${qutoAsset?.name?.toLowerCase()})`,
          dataIndex: "name",
          render: (text, row) => {
            if (!nostrAccount) {
              return "--";
            }
            const balance = balanceList?.[text]?.balanceShow || 0;

            if (text?.toLowerCase() == QUOTE_ASSET?.toLowerCase()) {
              const value = qutoAsset ? BigNumber(1).times(balance).toNumber() : "--";
              return value != "--" ? (
                <div>
                  <div className="color-light">{numberWithCommas(limitDecimals(value, qutoAsset?.reserve || 0))}</div>
                  <div className="f12 color-dark">
                    {/* {value * quote_pirce ? `≈$${numberWithCommas(limitDecimals(value * quote_pirce, 2))}` : "--"} */}
                    {convertDollars(value, quote_pirce)}
                  </div>
                </div>
              ) : (
                "--"
              );
            }
            const priceDetail = list.find((item) => item?.name == text);
            const value =
              priceDetail?.deal_price && qutoAsset
                ? BigNumber(priceDetail.deal_price).div(qutoAsset?.decimals).times(balance).toNumber()
                : "--";
            // return;
            return value != "--" ? (
              <div>
                <div className="color-light">{numberWithCommas(limitDecimals(value, qutoAsset?.reserve || 0))}</div>
                <div className="f12 color-dark">
                  {/* {value * quote_pirce ? `≈$${numberWithCommas(limitDecimals(value * quote_pirce, 2))}` : "--"} */}
                  {convertDollars(value, quote_pirce)}
                </div>
              </div>
            ) : (
              "--"
            );
          }
        },
        {
          title: t`Action`,
          dataIndex: "status",
          width: 260,
          render: (text, row) => {
            return (
              <div className="account-table-btns">
                <CheckNostrButton>
                  <Button
                    type="primary"
                    size="small"
                    onClick={() => {
                      const platform = ASSET_PLAT_MAP[row.assetType];
                      onHandleRedirect(`receive/${platform}/${row?.name}`);
                    }}
                  >
                    {t`Receive`}
                  </Button>
                </CheckNostrButton>
                <CheckNostrButton>
                  <Button
                    type="primary"
                    size="small"
                    onClick={() => {
                      const platform = ASSET_PLAT_MAP[row.assetType];
                      onHandleRedirect(`send/${platform}/${row?.name}`);
                    }}
                  >
                    {t`Send`}
                  </Button>
                </CheckNostrButton>
                <CheckNostrButton>
                  <Button type="primary" size="small" onClick={() => transferShow(row)}>
                    {t`Transfer`}
                  </Button>
                </CheckNostrButton>
              </div>
            );
          }
        }
      ];
    } else {
      return [
        {
          title: t`Asset`,
          dataIndex: "name"
        },
        // {
        //   title: t`Asset ID`,
        //   dataIndex: "token",
        //   render(text, row) {
        //     return text ? (
        //       <Tooltip
        //         overlayClassName="token-address-tooltip"
        //         title={
        //           <div>
        //             <div>Asset name: {row?.name || "--"}</div>
        //             <div>
        //               Asset ID:{" "}
        //               {row?.token
        //                 ? row?.token?.substring(0, 10) + "..." + row?.token?.substring(row?.token?.length - 6)
        //                 : "--"}
        //             </div>
        //             <div>Total supply: {row?.totalSupply ? numberWithCommas(row?.totalSupply) : "--"}</div>
        //           </div>
        //         }
        //       >
        //         <div>
        //           <EllipsisMiddle suffixCount={6}>{text}</EllipsisMiddle>
        //         </div>
        //       </Tooltip>
        //     ) : (
        //       "--"
        //     );
        //   }
        // },
        // {
        //   title: `Last Price (${qutoAsset?.name?.toLowerCase()})`,
        //   dataIndex: "name",
        //   width: "140px",
        //   render: (text, row) => {
        //     if (text == QUOTE_ASSET) {
        //       return `1`;
        //     }
        //     const priceDetail = list.find((item) => item?.name == text);
        //     const price =
        //       priceDetail?.deal_price && qutoAsset
        //         ? BigNumber(priceDetail.deal_price).div(qutoAsset?.decimals).toNumber()
        //         : "--";
        //     // return;
        //     return price != "--" ? (
        //       <div>
        //         <div className="color-light">{numberWithCommas(limitDecimals(price, qutoAsset?.reserve || 0))}</div>
        //         <div className="color-dark">
        //           {price * quote_pirce ? `≈$${numberWithCommas(limitDecimals(price * quote_pirce, 2))}` : "--"}
        //         </div>
        //       </div>
        //     ) : (
        //       "--"
        //     );
        //   }
        // },
        {
          title: t`Amount`,
          dataIndex: "name",
          // width: "140px",
          render: (text) => {
            const balance = balanceList?.[text]?.balanceShow;
            return balance ? <span className="color-light">{numberWithCommas(balance)}</span> : "--";
          }
        },
        {
          title: `Value (${qutoAsset?.name?.toLowerCase()})`,
          dataIndex: "name",
          // width: "140px",
          render: (text, row) => {
            if (!nostrAccount) {
              return "--";
            }
            const balance = balanceList?.[text]?.balanceShow || 0;

            if (text?.toLowerCase() == QUOTE_ASSET?.toLowerCase()) {
              const value = qutoAsset ? BigNumber(1).times(balance).toNumber() : "--";
              return value != "--" ? (
                <div>
                  <div className="color-light">{numberWithCommas(limitDecimals(value, qutoAsset?.reserve || 0))}</div>
                  <div className="f12 color-dark">
                    {/* {value * quote_pirce ? `≈$${numberWithCommas(limitDecimals(value * quote_pirce, 2))}` : "--"} */}
                    {convertDollars(value, quote_pirce)}
                  </div>
                </div>
              ) : (
                "--"
              );
            }
            const priceDetail = list.find((item) => item?.name == text);
            const value =
              priceDetail?.deal_price && qutoAsset
                ? BigNumber(priceDetail.deal_price).div(qutoAsset?.decimals).times(balance).toNumber()
                : "--";
            // return;
            return value != "--" ? (
              <div>
                <div className="color-light">{numberWithCommas(limitDecimals(value, qutoAsset?.reserve || 0))}</div>
                <div className="f12 color-dark">
                  {/* {value * quote_pirce ? `≈$${numberWithCommas(limitDecimals(value * quote_pirce, 2))}` : "--"} */}
                  {convertDollars(value, quote_pirce)}
                </div>
              </div>
            ) : (
              "--"
            );
          }
        }
      ];
    }
  }, [width, qutoAsset, list, quote_pirce, balanceList, nostrAccount, onHandleRedirect, transferShow]);

  return (
    <>
      <NoticeModal />
      {!nostrAccount && (
        <div className="account-nologin">
          <div className="account-nologin-content">
            <div className="account-nologin-content-text f18 b">{t`First Asset Management Platform`}</div>
            <div className="account-nologin-content-text">
              {t`Powered by Nostr Protocol, Secured by Lightning Network. `}
            </div>
            <div className="account-nologin-content-text">{t`Connect Nostr to start managing your assets`}</div>
            <div className="account-nologin-content-btns">
              <ConnectNostr />
            </div>
          </div>
        </div>
      )}

      <div className="account">
        {!!nostrAccount && (
          <div className="account-head">
            <div className="account-head-left">
              <div className="account-head-left-logo">
                <img src={avatar} alt="" />
              </div>

              <div className="account-head-left-nostr">
                <div className="f14">My Nostr Address</div>
                <div className="account-head-left-nostr-text">
                  <EllipsisMiddle suffixCount={8}>{nip19.npubEncode(nostrAccount)}</EllipsisMiddle>
                </div>
                <div className="account-head-left-btns">
                  <ProModal />
                  <Button
                    className="account-head-left-btns-addressBook"
                    size="small"
                    type="primary"
                    onClick={() => setIsAddressBookShow(true)}
                  >
                    {t`Address Book`}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="account-table-box">
          <div className="account-tokenList-title">
            <div className="account-tokenList-title-left">
              <img src={asset} alt="" />
              <span>{t`Assets`}</span>
            </div>
            <div className="account-tokenList-title-right">
              Universe Host:{" "}
              <EllipsisMiddle suffixCount={5} suffixEnable={device.isMobile ? true : false}>
                tapd.nostrassets.com:10029
              </EllipsisMiddle>
            </div>
          </div>
          <div className="account-tokenList-actions">
            <div className="account-tokenList-total">
              <div className="b">
                {totalValue ? numberWithCommas(limitDecimals(totalValue, qutoAsset?.reserve || 0)) : "0"}{" "}
                {qutoAsset?.name?.toLowerCase()}{" "}
                <CheckNostrButton>
                  <span className="account-tokenList-title__reload" onClick={handleReloadBalance}>
                    <ReloadOutlined />
                  </span>
                </CheckNostrButton>
              </div>

              <div className="f12 mt5 color-dark">
                {/* {totalValue * quote_pirce} */}
                {/* {totalValue * quote_pirce ? `≈$${numberWithCommas(limitDecimals(totalValue * quote_pirce, 2))}` : "--"} */}
                {convertDollars(totalValue, quote_pirce)}
              </div>
            </div>
            <div className="account-tokenList-actions-btns">
              {width > 768 ? (
                <>
                  <CheckNostrButton>
                    <Button
                      type="primary"
                      icon={<TransferSvg width={22} height={22} />}
                      onClick={() => transferShow(null)}
                    >
                      {t`Nostr Assets Transfer`}
                    </Button>
                  </CheckNostrButton>
                  <CheckNostrButton>
                    <Button
                      type="primary"
                      icon={<ReceiveSvg width={26} color="#fff" height={26} />}
                      onClick={() => {
                        onHandleRedirect("receive");
                      }}
                    >{t`Receive Assets`}</Button>
                  </CheckNostrButton>
                  <CheckNostrButton>
                    <Button
                      type="primary"
                      icon={<SendSvg width={26} height={26} />}
                      onClick={() => {
                        onHandleRedirect("send");
                      }}
                    >{t`Send Assets`}</Button>
                  </CheckNostrButton>
                  <CheckNostrButton>
                    <Button
                      type="primary"
                      icon={<AssetSvg width={26} height={26} />}
                      // onClick={() => message.info("Coming soon")}
                      onClick={() => {
                        goImportAssets();
                      }}
                    >
                      {t`Import Assets`}
                    </Button>
                  </CheckNostrButton>
                </>
              ) : (
                <>
                  <CheckNostrButton>
                    <Button type="primary" size="small" onClick={() => transferShow(null)}>
                      {t`Transfer`}
                    </Button>
                  </CheckNostrButton>
                  <CheckNostrButton>
                    <Button
                      type="primary"
                      size="small"
                      onClick={() => {
                        onHandleRedirect("receive");
                      }}
                    >{t`Receive`}</Button>
                  </CheckNostrButton>
                  <CheckNostrButton>
                    <Button
                      type="primary"
                      size="small"
                      onClick={() => {
                        onHandleRedirect("send");
                      }}
                    >{t`Send`}</Button>
                  </CheckNostrButton>
                  <CheckNostrButton>
                    <Button
                      type="primary"
                      // icon={<AssetSvg width={26} height={26} />}
                      // onClick={() => message.info("Coming soon")}
                      onClick={() => {
                        goImportAssets();
                      }}
                    >
                      {t`Import`}
                    </Button>
                  </CheckNostrButton>
                  {/* <CheckNostrButton>
                    <Button
                      type="primary"
                      size="small"
                      onClick={() => {
                        // message.info("")
                        Modal.warning({
                          title:
                            "",
                          content: <div className="color-base mb10">Importing Assets is not supported on mobile currently, please go to the web for the operation.</div>,
                          maskClosable: true,
                          wrapClassName: "import-assets-warning"
                        });
                      }}
                    >
                      {t`Import`}
                    </Button>
                  </CheckNostrButton> */}
                </>
              )}
            </div>
          </div>
          <Spin spinning={reloading}>
            <Table
              className="table-light"
              loading={!tokenList.length}
              // sticky
              scroll={{
                x: 400
              }}
              showSorterTooltip={false}
              rowKey="name"
              columns={tokenList.length > 0 ? columns : []}
              dataSource={tokenList || []}
              pagination={false}
            />
          </Spin>
        </div>
        <Transfer isTransferShow={isTransferShow} setIsTransferShow={setIsTransferShow} detail={detail}></Transfer>
        <AddressBook isAddressBookShow={isAddressBookShow} setIsAddressBookShow={setIsAddressBookShow}></AddressBook>
      </div>
    </>
  );
}
export default memo(Account);
