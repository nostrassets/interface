import { Button, Spin, Form, Input, InputNumber, Tooltip, Row, Col } from "antd";
import { useMintAsset } from "hooks/useMintAssets";
import { useUnisatPayfee } from "hooks/usePayfee";
import { useQueryAssetByEventIdOrAssetName, useQueryAssetByName } from "hooks/graphQuery/useExplore";
import PayAndMintProgress from "../comps/PayAndMintProgress";
import SubmitModal from "../comps/SubmitModal";
import CheckNostrButton from "components/CheckNostrButton";
import { useState, useCallback, useMemo, useEffect } from "react";
import { useHistory, useParams } from "react-router-dom";
import { LeftOutlined, QuestionCircleFilled } from "@ant-design/icons";
import { useSelector } from "react-redux";
import { useClient } from "urql";
import "./index.scss";
import ConnectWallet from "components/Common/ConnectWallet";
import BRC20Fee from "components/BRC20Fee";
import { ISSUE_ASSET_STATUS } from "config/constants";

const GRAPH_BASE = process.env.REACT_APP_GRAPH_BASE;
export default function MintCreate() {
  const [form] = Form.useForm();
  const params = useParams();
  const history = useHistory();
  const [submitModalVisible, setSubmitModalVisible] = useState(false);
  // const [createdId, setCreatedId] = useState("85215b48fa3ca73e55f24d6ac55db97e5b25056909439bc9e31c7e0338a778d4");
  const [saveLoding, setSaveLoding] = useState(false);
  const [payBtnLoading, setPayBtnLoading] = useState(false);

  const {
    list,
    fetching: loadingData,
    reexcuteQuery
  } = useQueryAssetByEventIdOrAssetName({ eventId: params?.eventId });
  const QueryGraphaql = useQueryAssetByName();
  const client = useClient();
  const { handleUnisatPay } = useUnisatPayfee();
  const { handleCreateAssetAsync, handleUpdateAssetAsync, handleCreateMintPayAsync } = useMintAsset();
  const { nostrAccount, account } = useSelector(({ user }) => user);
  const [IssueAsset, setIssueAsset] = useState(null);
  const [fee, setFee] = useState(0);
  const memoEventId = useMemo(() => {
    const { eventId } = params;
    return eventId ? eventId : "";
  }, [params]);
  const creator = useMemo(() => {
    return IssueAsset?.creator;
  }, [IssueAsset?.creator]);

  const issueAssetStatus = useMemo(() => {
    return IssueAsset?.status !== undefined ? IssueAsset.status : -1;
  }, [IssueAsset?.status]);
  const payBtnDisable = useMemo(() => {
    return (
      (nostrAccount !== creator && creator) || issueAssetStatus > ISSUE_ASSET_STATUS.NEW || issueAssetStatus === -1
    );
  }, [creator, issueAssetStatus, nostrAccount]);
  const memoSaveDisable = useMemo(() => {
    return (creator && nostrAccount !== creator) || issueAssetStatus > ISSUE_ASSET_STATUS.NEW;
  }, [creator, issueAssetStatus, nostrAccount]);

  const showConnectBtn = useMemo(() => {
    if (nostrAccount !== creator) {
      return false;
    }
    if (params?.eventId && !account && issueAssetStatus > -1) {
      return true;
    }
    return false;
  }, [account, creator, issueAssetStatus, nostrAccount, params?.eventId]);

  const showBRC20Fee = useMemo(() => {
    return params?.eventId && issueAssetStatus === ISSUE_ASSET_STATUS.NEW && creator === nostrAccount;
  }, [creator, issueAssetStatus, nostrAccount, params?.eventId]);

  const showClaimBtn = useMemo(() => {
    return nostrAccount && nostrAccount === creator && issueAssetStatus === ISSUE_ASSET_STATUS.IMPORT_FINISHED;
  }, [creator, issueAssetStatus, nostrAccount]);
  const assetMintProgress = useMemo(() => {
    return {
      status: issueAssetStatus,
      payTxHash: IssueAsset?.pay_tx_hash,
      createTxHash: IssueAsset?.create_tx_hash
    };
  }, [IssueAsset?.create_tx_hash, IssueAsset?.pay_tx_hash, issueAssetStatus]);

  const onSave = useCallback(async () => {
    setSaveLoding(true);
    try {
      const values = form.getFieldsValue(true);
      await form.validateFields();
      const jsonStr = JSON.stringify(values);
      const encodeAssetData = window.btoa(jsonStr);
      if (!memoEventId) {
        // create
        const ret = await handleCreateAssetAsync({ encodeAssetData });
        const { sendEvent, result } = ret;
        if (result.code === 0) {
          window._message.success(result.data);
          const sendEventId = sendEvent.id;
          history.replace(`/mint/create/${sendEventId}`);
        } else {
          throw new Error(result.msg);
        }
      } else {
        // update existing asset
        const ret = await handleUpdateAssetAsync({ id: memoEventId, encodeAssetData });
        const { result } = ret;
        if (result.code === 0) {
          window._message.success("Update Asset submitted successfully");
        } else {
          throw new Error(result.msg);
        }
      }
    } catch (err) {
      err.message && window._message.error(err.message);
    } finally {
      setSaveLoding(false);
    }
  }, [form, memoEventId, handleCreateAssetAsync, history, handleUpdateAssetAsync]);
  const onPaymentAndCreateAsset = useCallback(async () => {
    try {
      setPayBtnLoading(true);
      //await form.validateFields();
      if (!fee) {
        throw new Error("Fee must be provided.");
      }
      const formData = form.getFieldsValue();
      const encodeAssetData = window.btoa(JSON.stringify(formData));
      const txId = await handleUnisatPay(memoEventId, fee);
      if (!txId) throw new Error("Pay failed.");
      // setPayTxId(txId);
      const ret = await handleCreateMintPayAsync({ id: memoEventId, txId, encodeAssetData });
      const { result } = ret;
      if (result.code !== 0) {
        throw new Error(result.data);
      }
      window._message.success(result.data);
      setSubmitModalVisible(true);
    } catch (err) {
      if (err.message) {
        window._message.error(err.message);
      }
    } finally {
      setPayBtnLoading(false);
      reexcuteQuery();
    }
  }, [fee, form, handleCreateMintPayAsync, handleUnisatPay, memoEventId, reexcuteQuery]);

  const formReadOnly = useMemo(() => {
    return (!!params?.eventId && nostrAccount !== creator) || issueAssetStatus > ISSUE_ASSET_STATUS.NEW;
  }, [creator, issueAssetStatus, nostrAccount, params?.eventId]);
  const memoLabelServiceFee = useMemo(() => {
    return (
      <>
        <span style={{ paddingRight: "5px" }}>Service fee</span>
        <Tooltip title="NostrAssets charges a BTC service fee for issuing assets. Please ensure your connected wallet has enough balance.">
          <QuestionCircleFilled />
        </Tooltip>
      </>
    );
  }, []);

  useEffect(() => {
    if (list.length > 0) {
      const assetItem = list[0];
      if (assetItem) {
        const detailData = JSON.parse(assetItem.data);
        form.setFieldsValue({
          ...detailData
        });
        setIssueAsset(assetItem);
      }
    }
  }, [form, list]);

  return (
    <>
      <SubmitModal visible={submitModalVisible} setVisible={setSubmitModalVisible} />
      <div className="nostr-assets-container">
        <div className="nostr-assets-back">
          <Button
            type="link"
            onClick={() => {
              history.goBack(-1);
            }}
            icon={<LeftOutlined />}
          >
            Back
          </Button>
        </div>
        <h3 className="nostr-assets-titleh3">Issue Asset</h3>
        <div className="nostr-assets-titleh3-description">
          The Taproot assets you issue will be sent directly into your NostrAssets account, granting you complete
          control over them. Additionally, you can launch mint activities for these assets on NostrAssets.
        </div>

        <Spin spinning={loadingData}>
          <Form
            name="mintCreate"
            layout="inline"
            className="nostr-assets-form"
            form={form}
            disabled={formReadOnly}
            labelCol={{
              span: 8
            }}
            wrapperCol={{
              span: 16
            }}
            style={{
              maxWidth: "100%"
            }}
            initialValues={{ decimal: 1, displayDecimal: 1 }}
            autoComplete="off"
          >
            <h4 className="nostr-assets-form-groupInfo">Asset info</h4>
            <Row gutter={[24, 24]}>
              <Col span={12}>
                <Form.Item
                  label="Asset Name"
                  name="name"
                  required
                  validateTrigger="onBlur"
                  rules={[
                    () => ({
                      async validator(_, value) {
                        if (value) {
                          const tableName = `${GRAPH_BASE}nostr_create_assets`;
                          const res = await client
                            .query(QueryGraphaql, { name: value })
                            .toPromise()
                            .catch(() => {});
                          if (!params?.eventId) {
                            // create
                            if (res.data[tableName].length > 0) {
                              return Promise.reject("This assetName already exists");
                            }
                          } else {
                            //update
                            const isExist = res.data[tableName]?.find(
                              (item) => item.name === value && item.creator !== nostrAccount
                            );
                            if (isExist) {
                              return Promise.reject("This assetName already exists");
                            }
                          }

                          return Promise.resolve();
                        }
                        return Promise.reject("Please input the asset name.");
                      }
                    })
                  ]}
                >
                  <Input placeholder="Please input asset name" maxLength={20} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Asset Symbol"
                  name="symbol"
                  rules={[
                    {
                      required: true,
                      maxLength: 10,
                      message: "Please input the asset symbol"
                    }
                  ]}
                >
                  <Input placeholder="Please input the asset symbol" maxLength={10} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Total Supply"
                  required
                  name="amount"
                  rules={[
                    /*  {
                      required: true,
                      message: "How many of this asset will supply"
                    }, */
                    {
                      validator(_, value) {
                        if (value) {
                          if (Number(value) < 100 || Number(value) > 100000000000) {
                            return Promise.reject(new Error("Total Supply is a number from 100 to 100000000000."));
                          }
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error("Please enter the supply mount value"));
                      }
                    }
                  ]}
                >
                  <InputNumber size="middle" controls={false} placeholder="How many of this asset will supply" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Description (Optional)" name="description">
                  <Input placeholder="Please input the description" maxLength={500} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Asset Deploy Decimal"
                  name="decimal"
                  required
                  rules={[
                    {
                      validator(_, value) {
                        if (value) {
                          if (Number(value) < 0 || Number(value) > 18) {
                            return Promise.reject(new Error("Asset Deploy Decimal is a number from 0 to 18."));
                          }
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error("Please enter the asset deploy decimal."));
                      }
                    }
                  ]}
                >
                  <InputNumber size="middle" controls={false} placeholder="Please enter the asset deploy decimal" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Asset Display Decimal"
                  name="displayDecimal"
                  required
                  rules={[
                    {
                      validator(_, value) {
                        if (value) {
                          if (Number(value) < 0 || Number(value) > 18) {
                            return Promise.reject(new Error("Asset Display Decimal is a number from 0 to 18."));
                          }
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error("Please enter the asset display decimal."));
                      }
                    }
                  ]}
                >
                  <InputNumber size="middle" controls={false} placeholder="Please enter the asset display decimal" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Logo URL"
                  name="logo"
                  rules={[
                    {
                      required: true,
                      message: "Please input your asset's logo url."
                    },
                    {
                      type: "url"
                    }
                  ]}
                >
                  <Input placeholder="Please input your asset logo url." />
                </Form.Item>
              </Col>
            </Row>

            <h4 className="nostr-assets-form-groupInfo">Social Media (Optional)</h4>

            <Row gutter={[24, 24]}>
              <Col span={12}>
                <Form.Item label="Twitter" name="twitter">
                  <Input placeholder="Please input twitter ID" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Telegram" name="telegram">
                  <Input placeholder="Please input telegram ID" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Discord" name="discord">
                  <Input placeholder="Please input discord ID" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Nostr Address" name="nostrAddress">
                  <Input placeholder="Please input nostr address" />
                </Form.Item>
              </Col>
            </Row>

            {!memoSaveDisable && (
              <Row justify="center" className="submit">
                <Button type="primary" size="middle" loading={saveLoding} onClick={onSave}>
                  Save
                </Button>
              </Row>
            )}

            <Row className="nostr-assets-form-servicefee">
              <Col span={12}>
                <Form.Item label={memoLabelServiceFee}>
                  <span className="nostr-assets-form-servicefee__value">1200 sats</span>
                </Form.Item>
              </Col>
            </Row>

            {params?.eventId && issueAssetStatus === ISSUE_ASSET_STATUS.NEW && creator === nostrAccount && (
              <Row className="nostr-assets-form-servicefee__sat">
                <Col span={11}>
                  <BRC20Fee setFee={setFee} ready={true} />
                </Col>
              </Row>
            )}

            {issueAssetStatus > ISSUE_ASSET_STATUS.NEW && (
              <>
                <h4 className="nostr-assets-form-groupInfo">Payment & Issue Asset Progress</h4>
                <Row style={{ width: "100%" }}>
                  <PayAndMintProgress assetMintProgress={assetMintProgress} />
                </Row>
              </>
            )}
          </Form>
        </Spin>
        <div className="nostr-assets-mint">
          {!payBtnDisable ? (
            account ? (
              <CheckNostrButton>
                <Button
                  type="primary"
                  size="middle"
                  disabled={payBtnDisable}
                  onClick={onPaymentAndCreateAsset}
                  loading={payBtnLoading}
                >
                  Cofirm Payment and Issue Asset
                </Button>
              </CheckNostrButton>
            ) : showConnectBtn ? (
              <ConnectWallet tokenPlatform="BRC20" connectTip="Connect wallet to pay the service fee." />
            ) : null
          ) : null}

          {showClaimBtn && <Button type="primary">Claim</Button>}
        </div>
      </div>
    </>
  );
}
