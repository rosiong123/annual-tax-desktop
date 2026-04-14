/**
 * 合规性规则常量
 * 来源: tax-audit-pro/src/backend/compliance_engine.py
 * 已内联到本仓库，避免跨仓库相对路径
 */

export const COMPLIANCE_RULES = {
  rd_expense: {
    name: "研发费用加计扣除",
    deduction_ratio: { high_tech: 1.0, general: 0.75 },
    required_evidence: [
      "研发项目立项文件", "研发费用辅助账", "研发人员工资表",
      "研发设备折旧清单", "材料耗用清单", "委托研发合同（如有）"
    ]
  },
  small_micro: {
    name: "小微企业所得税优惠",
    conditions: {
      max_employees: 300,
      max_assets: 50000000,
      max_profit: 3000000
    },
    tax_rates: {
      standard: 0.25,
      small_micro_under_300: 0.05,
      small_micro_under_300_to_300: 0.10
    },
    required_evidence: ["从业人数计算表", "资产总额说明", "小微优惠声明"]
  },
  entertainment: {
    name: "业务招待费",
    deduction_limit_ratio: 0.005,
    super_deduction_ratio: 0.6,
    required_evidence: ["招待费清单", "发票", "招待事由说明"]
  },
  advertisement: {
    name: "广告宣传费",
    deduction_limit_ratio: 0.15,
    special_industry_ratio: 0.30,
    required_evidence: ["广告合同", "广告发票", "广告投放明细"]
  },
  welfare: {
    name: "职工福利费",
    deduction_limit_ratio: 0.14,
    required_evidence: ["福利费明细表", "相关发票", "职工名单"]
  },
  no_invoice: {
    name: "无发票支出",
    threshold: 5000,
    required_evidence: ["发票", "付款凭证"]
  },
  related_party: {
    name: "关联交易",
    thresholds: { revenue_ratio: 0.50, assets_ratio: 0.50 },
    required_evidence: ["关联申报表", "同期资料"]
  }
};
