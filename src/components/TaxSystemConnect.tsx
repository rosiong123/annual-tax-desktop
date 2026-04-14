import { useState } from 'react';
import { Building, Key, CheckCircle, Loader, AlertCircle, ExternalLink } from 'lucide-react';

interface TaxSystemConnectProps {
  onConnected: (data: any) => void;
}

export default function TaxSystemConnect({ onConnected }: TaxSystemConnectProps) {
  const [step, setStep] = useState<'select' | 'login' | 'connecting' | 'success'>('select');
  const [taxSystem, setTaxSystem] = useState<'etax' | 'fangfang' | null>(null);
  const [taxId, setTaxId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // 连接税务系统
  const connect = async () => {
    if (!taxId || !password) {
      setError('请输入纳税人识别号和密码');
      return;
    }

    setStep('connecting');
    setError('');

    // 模拟连接过程
    await new Promise(resolve => setTimeout(resolve, 2500));

    // 返回模拟数据
    const mockData = {
      preTaxPayment: 200000,      // 已预缴税额
      filingStatus: 'pending',    // 申报状态
      dueDate: '2027-05-31',      // 截止日期
      lastFilingDate: '2026-04-15', // 上次申报日期
      taxTypes: [
        { name: '企业所得税', status: '未申报' },
        { name: '增值税', status: '已申报' },
        { name: '印花税', status: '已申报' }
      ]
    };

    setStep('success');
    onConnected(mockData);
  };

  const taxSystems = [
    {
      id: 'etax',
      name: '电子税务局',
      description: '全国统一的电子税务申报系统',
      icon: '📮',
      url: 'https://etax.chinatax.gov.cn',
      features: ['一键申报', '在线缴款', '完税证明']
    },
    {
      id: 'fangfang',
      name: '方了然系统',
      description: '智能税务申报辅助系统',
      icon: '📊',
      url: 'https://www.fangfang.cn',
      features: ['智能填报', '风险预警', '政策推送']
    }
  ];

  return (
    <div className="space-y-4">
      <div className="bg-orange-50 rounded-xl p-4">
        <h3 className="font-semibold text-orange-900 mb-2 flex items-center gap-2">
          <Building className="w-5 h-5" />
          连接税务系统
        </h3>
        <p className="text-sm text-orange-800">
          连接后可直接申报，无需手动填写税务表格
        </p>
      </div>

      {/* 选择税务系统 */}
      {step === 'select' && (
        <div className="grid gap-3">
          {taxSystems.map(system => (
            <button
              key={system.id}
              onClick={() => {
                setTaxSystem(system.id as 'etax' | 'fangfang');
                setStep('login');
              }}
              className="border-2 border-gray-200 hover:border-orange-300 rounded-xl p-4 text-left transition"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{system.icon}</span>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{system.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{system.description}</p>
                  <div className="flex gap-2 mt-2">
                    {system.features.map((f, i) => (
                      <span key={i} className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-600">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* 登录 */}
      {step === 'login' && taxSystem && (
        <div className="border-2 border-gray-200 rounded-xl p-4">
          <h4 className="font-semibold text-gray-900 mb-4">
            登录 {taxSystems.find(s => s.id === taxSystem)?.name}
          </h4>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                纳税人识别号
              </label>
              <input
                type="text"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="请输入统一社会信用代码"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                密码
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入登录密码"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep('select')}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                返回
              </button>
              <button
                onClick={connect}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition flex items-center justify-center gap-2"
              >
                <Key className="w-4 h-4" />
                登录
              </button>
            </div>

            <div className="pt-2 text-center">
              <a
                href={taxSystems.find(s => s.id === taxSystem)?.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-orange-600 hover:underline flex items-center justify-center gap-1"
              >
                <ExternalLink className="w-4 h-4" />
                打开官网
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 连接中 */}
      {step === 'connecting' && (
        <div className="border-2 border-gray-200 rounded-xl p-8 text-center">
          <Loader className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-700 font-medium">正在连接税务系统...</p>
          <p className="text-sm text-gray-500 mt-2">请稍候</p>
        </div>
      )}

      {/* 成功 */}
      {step === 'success' && (
        <div className="border-2 border-green-200 bg-green-50 rounded-xl p-4">
          <div className="flex items-center gap-3 text-green-700 mb-4">
            <CheckCircle className="w-8 h-8" />
            <span className="font-semibold">已成功连接税务系统</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-white rounded-lg p-3">
              <p className="text-gray-500">已预缴税额</p>
              <p className="text-xl font-semibold text-gray-900">¥200,000</p>
            </div>
            <div className="bg-white rounded-lg p-3">
              <p className="text-gray-500">申报截止日</p>
              <p className="text-xl font-semibold text-gray-900">2027-05-31</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <p className="text-sm text-gray-600">税种状态：</p>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
                企业所得税 - 待申报
              </span>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                增值税 - 已完成
              </span>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                印花税 - 已完成
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
