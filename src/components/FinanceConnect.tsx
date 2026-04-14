import { useState } from 'react';
import { Database, Server, Cloud, CheckCircle, ExternalLink, Loader } from 'lucide-react';

// 财务软件类型
type FinanceSoftware = 'ufida' | 'kingdee' | 'lingshang' | null;

interface FinanceConnectProps {
  onConnected: (software: string, data: any) => void;
}

export default function FinanceConnect({ onConnected }: FinanceConnectProps) {
  const [selectedSoftware, setSelectedSoftware] = useState<FinanceSoftware>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // 连接财务软件
  const connect = async (software: string) => {
    setSelectedSoftware(software as FinanceSoftware);
    setIsConnecting(true);

    // 模拟连接过程
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 返回模拟数据
    const mockData = {
      balanceSheet: {
        year: 2026, assets: 5000000, liabilities: 2000000, ownerEquity: 3000000,
        cash: 500000, accountsReceivable: 800000, inventory: 1000000,
        fixedAssets: 2000000, accountsPayable: 500000
      },
      incomeStatement: {
        year: 2026, revenue: 8000000, costOfSales: 5600000, grossProfit: 2400000,
        operatingExpense: 800000, managementExpense: 600000, financialExpense: 100000,
        operatingProfit: 1000000, totalProfit: 900000, netProfit: 675000
      },
      subjectBalances: [
        { code: '1001', name: '库存现金', category: '货币资金', openingBalance: 10000, debitBalance: 50000, creditBalance: 30000, closingBalance: 30000 },
        { code: '1002', name: '银行存款', category: '货币资金', openingBalance: 400000, debitBalance: 8000000, creditBalance: 7500000, closingBalance: 900000 },
        { code: '1122', name: '应收账款', category: '资产', openingBalance: 600000, debitBalance: 2000000, creditBalance: 1800000, closingBalance: 800000 }
      ],
      invoices: []
    };

    setIsConnecting(false);
    setIsConnected(true);
    onConnected(software, mockData);
  };

  const softwareList = [
    {
      id: 'ufida',
      name: '用友U8/U9',
      icon: '用友',
      description: '连接用友U8/U9 ERP系统',
      color: 'bg-red-100 text-red-700',
      steps: [
        '1. 打开用友U8/U9系统',
        '2. 进入「系统管理」→「数据接口」',
        '3. 导出年度财务数据',
        '4. 选择导出格式为XML/JSON'
      ]
    },
    {
      id: 'kingdee',
      name: '金蝶K3/KIS',
      icon: '金蝶',
      description: '连接金蝶K3/KIS系统',
      color: 'bg-blue-100 text-blue-700',
      steps: [
        '1. 打开金蝶K3/KIS系统',
        '2. 进入「财务处理」→「期末处理」',
        '3. 选择「引出账务数据」',
        '4. 选择引出格式'
      ]
    },
    {
      id: 'lingshang',
      name: '灵犀SDE',
      icon: '灵犀',
      description: '连接灵犀智能财税系统',
      color: 'bg-purple-100 text-purple-700',
      steps: [
        '1. 登录灵犀SDE系统',
        '2. 进入「数据管理」→「导出」',
        '3. 选择年度汇算期间',
        '4. 一键导出'
      ]
    }
  ];

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 rounded-xl p-4">
        <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <Database className="w-5 h-5" />
          连接财务软件
        </h3>
        <p className="text-sm text-blue-800">
          一键连接您的财务软件，自动获取年度财务数据，无需手动整理
        </p>
      </div>

      <div className="grid gap-3">
        {softwareList.map(software => (
          <div
            key={software.id}
            className={`border-2 rounded-xl p-4 transition ${
              selectedSoftware === software.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className={`w-12 h-12 rounded-lg ${software.color} flex items-center justify-center font-bold`}>
                  {software.icon}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{software.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{software.description}</p>
                </div>
              </div>

              {isConnected && selectedSoftware === software.id ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">已连接</span>
                </div>
              ) : isConnecting && selectedSoftware === software.id ? (
                <div className="flex items-center gap-2 text-blue-600">
                  <Loader className="w-5 h-5 animate-spin" />
                  <span className="text-sm font-medium">连接中...</span>
                </div>
              ) : (
                <button
                  onClick={() => connect(software.id)}
                  disabled={isConnecting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition disabled:opacity-50"
                >
                  连接
                </button>
              )}
            </div>

            {selectedSoftware === software.id && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-gray-600 mb-2">连接步骤：</p>
                <ol className="text-sm text-gray-500 space-y-1">
                  {software.steps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 手动导入选项 */}
      <div className="border-t pt-4">
        <p className="text-sm text-gray-600">
          没有找到您的财务软件？
          <button className="text-blue-600 hover:underline ml-1">
            查看支持的软件列表
          </button>
        </p>
      </div>
    </div>
  );
}
