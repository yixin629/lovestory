'use client'

import { useState, useEffect } from 'react'
import BackButton from '@/app/components/ui/BackButton'
import { useToast } from '@/app/components/feedback/ToastProvider'

interface Contract {
  id: string
  title: string
  content: string
  partyA: string
  partyB: string
  createdAt: string
  signatures: {
    partyA: boolean
    partyB: boolean
  }
}

interface ContractTemplate {
  id: string
  name: string
  emoji: string
  content: string
}

const CONTRACT_TEMPLATES: ContractTemplate[] = [
  {
    id: 'love',
    name: '甜蜜爱情契约',
    emoji: '💕',
    content: `甲方（{partyA}）与乙方（{partyB}）本着相互尊重、真诚相爱的原则，经友好协商，达成以下约定：

一、每天至少说一次"我爱你"
二、吵架不过夜，有问题当天解决
三、重要节日必须一起度过
四、对方难过时要给予拥抱和安慰
五、永远做对方最坚强的后盾

本契约自双方签字之日起生效，有效期：永远！`,
  },
  {
    id: 'daily',
    name: '日常生活契约',
    emoji: '🏠',
    content: `甲方（{partyA}）与乙方（{partyB}）为了共同创造美好生活，特此约定：

一、家务分工合理，互相帮助
二、每周至少一次约会时间
三、尊重对方的个人空间和爱好
四、大事商量，小事包容
五、共同管理财务，定期复盘

双方承诺遵守以上约定，共建幸福小家！`,
  },
  {
    id: 'promise',
    name: '承诺契约',
    emoji: '🤝',
    content: `我，{partyA}，郑重向 {partyB} 承诺：

一、永远对你忠诚，不离不弃
二、用心倾听你的心声
三、支持你的梦想和追求
四、在你需要时永远站在你身边
五、用一生的时间来爱护你

此承诺发自真心，永不改变！`,
  },
  {
    id: 'fun',
    name: '趣味契约',
    emoji: '🎮',
    content: `本契约由 {partyA} 和 {partyB} 共同签订：

一、谁先生气谁就要请吃饭
二、每周必须一起打游戏/看电影
三、对方讲冷笑话时必须配合笑
四、撒娇有效期：永久
五、亲亲抱抱举高高，随时随地可以要

本契约具有最高优先级，双方必须严格执行！😄`,
  },
  {
    id: 'custom',
    name: '自定义契约',
    emoji: '📝',
    content: '',
  },
]

export default function LoveContractPage() {
  const toast = useToast()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [partyA, setPartyA] = useState('')
  const [partyB, setPartyB] = useState('')
  const [viewingContract, setViewingContract] = useState<Contract | null>(null)

  // 加载契约
  useEffect(() => {
    const saved = localStorage.getItem('loveContracts')
    if (saved) {
      setContracts(JSON.parse(saved))
    }
  }, [])

  // 保存契约
  const saveContracts = (data: Contract[]) => {
    localStorage.setItem('loveContracts', JSON.stringify(data))
    setContracts(data)
  }

  // 选择模板
  const selectTemplate = (template: ContractTemplate) => {
    setTitle(template.name)
    setContent(template.content)
    setIsCreating(true)
  }

  // 创建契约
  const createContract = () => {
    if (!title.trim() || !content.trim() || !partyA.trim() || !partyB.trim()) {
      toast.error('请填写完整信息！')
      return
    }

    const processedContent = content.replace(/{partyA}/g, partyA).replace(/{partyB}/g, partyB)

    const newContract: Contract = {
      id: Date.now().toString(),
      title,
      content: processedContent,
      partyA,
      partyB,
      createdAt: new Date().toISOString(),
      signatures: {
        partyA: false,
        partyB: false,
      },
    }

    const updated = [newContract, ...contracts]
    saveContracts(updated)

    // 重置表单
    setIsCreating(false)
    setTitle('')
    setContent('')
    setPartyA('')
    setPartyB('')

    toast.success('契约创建成功！')
    setViewingContract(newContract)
  }

  // 签名
  const signContract = (contractId: string, party: 'partyA' | 'partyB') => {
    const updated = contracts.map((c) => {
      if (c.id === contractId) {
        const newSignatures = { ...c.signatures, [party]: true }
        if (newSignatures.partyA && newSignatures.partyB) {
          toast.success('🎉 契约正式生效！')
        }
        return { ...c, signatures: newSignatures }
      }
      return c
    })
    saveContracts(updated)

    if (viewingContract?.id === contractId) {
      setViewingContract(updated.find((c) => c.id === contractId) || null)
    }
  }

  // 删除契约
  const deleteContract = (contractId: string) => {
    if (confirm('确定要删除这份契约吗？')) {
      const updated = contracts.filter((c) => c.id !== contractId)
      saveContracts(updated)
      setViewingContract(null)
      toast.info('契约已删除')
    }
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-xl mx-auto">
        <BackButton href="/" text="返回首页" />

        <div className="card">
          <h1 className="text-3xl md:text-4xl font-bold text-primary text-center mb-2">
            📜 情侣契约书
          </h1>
          <p className="text-gray-600 text-center mb-6">创建属于你们的爱情约定</p>

          {/* 查看契约详情 */}
          {viewingContract && (
            <div className="mb-6">
              <button
                onClick={() => setViewingContract(null)}
                className="text-sm text-gray-500 hover:text-primary mb-3"
              >
                ← 返回列表
              </button>

              <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl p-6 border-2 border-pink-200">
                <div className="text-center mb-4">
                  <div className="text-4xl mb-2">📜</div>
                  <h2 className="text-xl font-bold text-gray-800">{viewingContract.title}</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    创建于 {new Date(viewingContract.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="bg-white rounded-xl p-4 mb-4 whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
                  {viewingContract.content}
                </div>

                {/* 签名区域 */}
                <div className="border-t-2 border-dashed border-pink-200 pt-4">
                  <h3 className="text-center text-sm font-semibold text-gray-600 mb-4">签名确认</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="font-medium mb-2">{viewingContract.partyA}</p>
                      {viewingContract.signatures.partyA ? (
                        <div className="text-pink-500 font-bold">✍️ 已签名</div>
                      ) : (
                        <button
                          onClick={() => signContract(viewingContract.id, 'partyA')}
                          className="btn-primary text-sm"
                        >
                          点击签名
                        </button>
                      )}
                    </div>
                    <div className="text-center">
                      <p className="font-medium mb-2">{viewingContract.partyB}</p>
                      {viewingContract.signatures.partyB ? (
                        <div className="text-blue-500 font-bold">✍️ 已签名</div>
                      ) : (
                        <button
                          onClick={() => signContract(viewingContract.id, 'partyB')}
                          className="btn-secondary text-sm"
                        >
                          点击签名
                        </button>
                      )}
                    </div>
                  </div>

                  {viewingContract.signatures.partyA && viewingContract.signatures.partyB && (
                    <div className="mt-4 text-center">
                      <span className="bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-semibold">
                        ✅ 契约已生效
                      </span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => deleteContract(viewingContract.id)}
                  className="w-full mt-4 text-red-500 text-sm hover:text-red-600"
                >
                  🗑️ 删除契约
                </button>
              </div>
            </div>
          )}

          {/* 创建契约表单 */}
          {isCreating && !viewingContract && (
            <div className="mb-6">
              <button
                onClick={() => {
                  setIsCreating(false)
                }}
                className="text-sm text-gray-500 hover:text-primary mb-3"
              >
                ← 返回选择模板
              </button>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">契约名称</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-pink-500"
                    placeholder="给契约起个名字"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">甲方姓名</label>
                    <input
                      type="text"
                      value={partyA}
                      onChange={(e) => setPartyA(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-pink-500"
                      placeholder="你的名字"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">乙方姓名</label>
                    <input
                      type="text"
                      value={partyB}
                      onChange={(e) => setPartyB(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-pink-500"
                      placeholder="ta的名字"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">契约内容</label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={10}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-pink-500 text-sm"
                    placeholder="写下你们的约定..."
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    提示：使用 {'{partyA}'} 和 {'{partyB}'} 会自动替换为双方姓名
                  </p>
                </div>

                <button onClick={createContract} className="w-full btn-primary py-3">
                  📜 创建契约
                </button>
              </div>
            </div>
          )}

          {/* 选择模板 */}
          {!isCreating && !viewingContract && (
            <>
              <div className="mb-6">
                <h3 className="font-semibold text-gray-700 mb-3">选择契约模板</h3>
                <div className="grid grid-cols-2 gap-3">
                  {CONTRACT_TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => selectTemplate(template)}
                      className="p-4 rounded-xl bg-gradient-to-br from-pink-50 to-purple-50 hover:from-pink-100 hover:to-purple-100 transition-all text-left"
                    >
                      <div className="text-2xl mb-2">{template.emoji}</div>
                      <div className="font-medium text-sm">{template.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 已有契约列表 */}
              {contracts.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-gray-700 mb-3">
                    📚 我的契约 ({contracts.length})
                  </h3>
                  <div className="space-y-2">
                    {contracts.map((contract) => (
                      <button
                        key={contract.id}
                        onClick={() => setViewingContract(contract)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-left transition-all"
                      >
                        <span className="text-2xl">📜</span>
                        <div className="flex-1">
                          <div className="font-medium text-sm">{contract.title}</div>
                          <div className="text-xs text-gray-500">
                            {contract.partyA} & {contract.partyB}
                          </div>
                        </div>
                        <div className="text-right">
                          {contract.signatures.partyA && contract.signatures.partyB ? (
                            <span className="text-xs text-green-600">✅ 生效中</span>
                          ) : (
                            <span className="text-xs text-orange-500">⏳ 待签名</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
