import { Radio, Row, Col } from "antd";
import { useState, useMemo, useCallback, useEffect } from "react";
import { useGetRecommendFee } from "hooks/unisatWallet/useGetFees";
import { useDeepCompareEffect } from "ahooks";
const MAPFEE = {
  Slow: { feeKey: "hourFee", tips: "Abount 1 hours" },
  Avg: { feeKey: "halfHourFee", tips: "Abount 30 minutes" },
  Fast: { feeKey: "fastestFee", tips: "Abount 10 minutes" },
  Custom: { feeKey: "custom" },
};
export default function BRC20Fee({
  feeRate,
  setFee,
  setFeeRate,
  ready = false,
}) {
  const { feesRecommended } = useGetRecommendFee(ready);

  const onChange = useCallback(
    ({ target: { value } }) => {
      setFeeRate(value);
      if (value === "Custom") {
        setFee("");
      } else {
        if (feesRecommended) {
          setFee(feesRecommended[MAPFEE[value].feeKey]);
        }
      }
    },
    [feesRecommended, setFee, setFeeRate]
  );
  const options = useMemo(() => {
    return feesRecommended
      ? Object.keys(MAPFEE).map((itemKey) => {
          const value = itemKey;
          const fee =
            itemKey !== "Custom" ? feesRecommended[MAPFEE[itemKey].feeKey] : "";
          const tips = itemKey === "Custom" ? "" : MAPFEE[itemKey].tips;
          return {
            label: (
              <Row style={{ height: "100%" }}>
                <Col align="center" className="fee-title" span={24}>
                  {itemKey}
                </Col>
                {itemKey !== "Custom" && (
                  <>
                    <Col align="center" className="fee-value" span={24}>
                      {fee} <span>salt/vB</span>
                    </Col>

                    <Col align="center" className="fee-tip" span={24}>
                      {tips}
                    </Col>
                  </>
                )}
              </Row>
            ),
            value: value,
          };
        })
      : [];
  }, [feesRecommended]);
  useDeepCompareEffect(() => {
    if (feeRate && feesRecommended) {
      setFee(feesRecommended[MAPFEE[feeRate].feeKey]);
    }
  }, [feeRate, feesRecommended, setFee]);

  return (
    <>
      <Radio.Group
        className="deposit-brc20-fees"
        options={options}
        onChange={onChange}
        value={feeRate}
        optionType="button"
        buttonStyle="solid"
      />
    </>
  );
}
