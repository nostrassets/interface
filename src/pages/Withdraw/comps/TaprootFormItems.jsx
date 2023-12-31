import { Form, Row, Col, Input, Button, Spin, Select } from "antd";

import { useEffect, useMemo, useState, useCallback } from "react";
import ConnectNostr from "components/Common/ConnectNostr";
import { useTaprootWithdraw, useTaprootDecode } from "hooks/useNostrMarket";
import { to } from "await-to-js";
import { useSelector } from "react-redux";
import { useThrottleFn } from "ahooks";
import { sleep } from "lib/utils";
import { useDispatch } from "react-redux";
import { setOnlyMobileSupportedVisible } from "store/reducer/modalReducer";
import useDevice from "hooks/useDevice";
export default function TaprootFormItems({
  form,
  nostrAccount,
  balance,
  notifiApi,
  messageApi,
  handleQueryBalance,
}) {
  const { TextArea } = Input;
  const [btnLoading, setBtnLoading] = useState(false);
  const { handleTaprootWithdrawAsync } = useTaprootWithdraw();
  const { handleTaprootDecodeAsync } = useTaprootDecode();
  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [decodeLoading, setDecodeloding] = useState(false);
  const { npubNostrAccount } = useSelector(({ user }) => user);
  const { tokenList } = useSelector(({ market }) => market);
  const dispatch = useDispatch();
  const device = useDevice();
  const handleWithdraw = useCallback(async () => {
    if (device.isMobile) {
      dispatch(setOnlyMobileSupportedVisible(true));
      return;
    }
    try {
      const [validateErr] = await to(form.validateFields());
      if (validateErr) {
        return;
      }
      if (!withdrawAmount) {
        messageApi.error({
          content: "The minimum withdrawal quantity is 1 TAPROOT.",
        });
        return;
      }
      if (withdrawAmount > Number(balance)) {
        messageApi.error({
          content: "Insfufficient balance.",
        });
        return;
      }
      setBtnLoading(true);
      const values = form.getFieldsValue(true);
      const withdrawRet = await handleTaprootWithdrawAsync(
        withdrawAmount,
        values.invoice,
        values.depositOrWithdrawToken
      );
      if (withdrawRet?.code === 0) {
        await sleep(4000);
        await handleQueryBalance(npubNostrAccount);
        messageApi.success({
          content: <p className="message-content">{withdrawRet.data}</p>,
        });
      } else {
        throw new Error(`Withdraw failed: ${withdrawRet?.data}`);
      }
    } catch (e) {
      messageApi.error({
        content: e.message,
      });
    } finally {
      setBtnLoading(false);
    }
  }, [
    balance,
    device.isMobile,
    dispatch,
    form,
    handleQueryBalance,
    handleTaprootWithdrawAsync,
    messageApi,
    npubNostrAccount,
    withdrawAmount,
  ]);
  const tokens = useMemo(() => {
    return tokenList.filter((item) => item.assetType === "TAPROOT");
  }, [tokenList]);
  const options = useMemo(() => {
    return tokens.map((tokenItem) => (
      <Select.Option value={tokenItem.name} key={tokenItem.id}>
        {tokenItem.name}
      </Select.Option>
    ));
  }, [tokens]);
  const memoWithdrawBalance = useMemo(() => {
    return (
      <span className="withdraw-amount-balance">
        Nostr Account balance: {balance} TAPROOT
      </span>
    );
  }, [balance]);
  const memoWithdrawBtn = useMemo(() => {
    return nostrAccount ? (
      <Button
        type="primary"
        size="large"
        className="withdraw-send-btn"
        loading={btnLoading}
        onClick={handleWithdraw}
        disabled={withdrawAmount === 0}
      >
        Send
      </Button>
    ) : (
      <ConnectNostr />
    );
  }, [btnLoading, handleWithdraw, nostrAccount, withdrawAmount]);

  const { run: handleInvoiceChange } = useThrottleFn(
    async ({ target: { value } }) => {
      try {
        if (value.length < 20) {
          throw new Error("min length 20");
        }
        setDecodeloding(true);
        const parsedData = await handleTaprootDecodeAsync(value);
        if (parsedData.code === 0) {
          const jsonData = JSON.parse(parsedData.data);
          setWithdrawAmount(jsonData.amount);
        } else {
          setWithdrawAmount(0);
          setDecodeloding(false);
        }
      } catch (err) {
        setWithdrawAmount(0);
      } finally {
        setDecodeloding(false);
      }
    },
    {
      wait: 500,
    }
  );

  useEffect(() => {
    form.setFieldValue("depositOrWithdrawFormNostrAddress", nostrAccount);
    if (tokens.length > 0) {
      form.setFieldValue("depositOrWithdrawToken", tokens[0].name);
    }
  }, [form, nostrAccount, tokens]);
  return (
    <>
      <Form.Item
        name="depositOrWithdrawFormNostrAddress"
        label="Send From Nostr Address"
        tooltip="The Nostr address is obtained from any Nostr clients (Damus,Amethyst,Iris etc.) or wallets that support the Nostr protocol. Please make sure to confirm that the Nostr address you are sending asset is correct and securely store the private key associated with that address."
        rules={[
          {
            required: true,
          },
          () => ({
            validator(_, value) {
              if (value) {
                if (!/npub\w{59}/.test(value)) {
                  return Promise.reject(
                    new Error(t`Please input a valid Nostr address.`)
                  );
                }
                nip19.decode(value).data;
                return Promise.resolve();
              }
              return Promise.resolve();
            },
          }),
        ]}
      >
        <Input
          readOnly
          size="large"
          style={{ maxWidth: "460px" }}
          placeholder="Please input your nostr address"
        />
      </Form.Item>
      <Form.Item name="depositOrWithdrawToken" label="Send Token">
        <Select
          placeholder="Please select the token which you want to send."
          allowClear={false}
          size="large"
          style={{ maxWidth: "460px" }}
        >
          {options}
        </Select>
      </Form.Item>
      <Form.Item label="Invoice">
        <Row className="withdraw-amount-row" align="middle">
          <Col span={24}>
            <Form.Item
              name="invoice"
              label="Invoice"
              noStyle
              rules={[
                {
                  required: true,
                },
                () => ({
                  validator(_, value) {
                    if (value) {
                      if (!/^tap\w+$/.test(value)) {
                        return Promise.reject(
                          new Error(`Please input a valid invoice.`)
                        );
                      }
                      return Promise.resolve();
                    }
                    return Promise.resolve();
                  },
                }),
              ]}
            >
              <TextArea
                placeholder="Please input an invoice"
                onChange={handleInvoiceChange}
                /* onBlur={handleInvoiceChange} */
                autoSize={{
                  minRows: 2,
                  maxRows: 6,
                }}
              />
            </Form.Item>
          </Col>
          {/* <Col span={8}>
            <Button type="link" onClick={handleMakeInvoice}>
              Create Invoice
            </Button>
          </Col> */}
        </Row>
      </Form.Item>

      <Form.Item label="Send Amount" extra={memoWithdrawBalance}>
        <Row className="withdraw-amount-row">
          <Col span={24}>
            <Form.Item name="amount" noStyle>
              <div className="lightning-withdraw">
                <span className="lightning-withdraw-amount">
                  <Spin spinning={decodeLoading}>{withdrawAmount}</Spin>
                </span>
              </div>
            </Form.Item>
          </Col>
        </Row>
      </Form.Item>
      <Row justify="center" className="mb20 fixed-btn">
        {memoWithdrawBtn}
      </Row>
    </>
  );
}
