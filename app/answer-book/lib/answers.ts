export type AnswerTone = 'bright' | 'patient' | 'cautious' | 'action' | 'reflective'

export interface BookAnswer {
  id: string
  text: string
  tone: AnswerTone
}

export const ANSWER_TONES: Record<AnswerTone, { label: string; accent: string; glow: string }> = {
  bright: { label: '值得期待', accent: 'text-amber-200', glow: 'from-amber-300/25' },
  patient: { label: '耐心一点', accent: 'text-sky-200', glow: 'from-sky-300/25' },
  cautious: { label: '谨慎前行', accent: 'text-orange-200', glow: 'from-orange-300/25' },
  action: { label: '现在行动', accent: 'text-emerald-200', glow: 'from-emerald-300/25' },
  reflective: { label: '听从内心', accent: 'text-violet-200', glow: 'from-violet-300/25' },
}

export const BOOK_ANSWERS: BookAnswer[] = [
  { id: 'a01', text: '答案正在向你靠近。', tone: 'bright' },
  { id: 'a02', text: '这一次，勇敢会带来好消息。', tone: 'bright' },
  { id: 'a03', text: '你期待的转机比想象中更近。', tone: 'bright' },
  { id: 'a04', text: '可以相信这个温柔的预感。', tone: 'bright' },
  { id: 'a05', text: '值得一试，结果可能让你惊喜。', tone: 'bright' },
  { id: 'a06', text: '事情会朝着明朗的方向发展。', tone: 'bright' },
  { id: 'a07', text: '你的认真不会被辜负。', tone: 'bright' },
  { id: 'a08', text: '一个真诚的回答会打开局面。', tone: 'bright' },
  { id: 'a09', text: '保持期待，好事正在酝酿。', tone: 'bright' },
  { id: 'a10', text: '这条路上会有人与你并肩。', tone: 'bright' },
  { id: 'a11', text: '再给它一点时间。', tone: 'patient' },
  { id: 'a12', text: '时机还没成熟，但方向没有错。', tone: 'patient' },
  { id: 'a13', text: '先睡一觉，明天会看得更清楚。', tone: 'patient' },
  { id: 'a14', text: '慢一点，重要的细节还没出现。', tone: 'patient' },
  { id: 'a15', text: '不必催促，答案会自然浮现。', tone: 'patient' },
  { id: 'a16', text: '先把今天能做的事情做好。', tone: 'patient' },
  { id: 'a17', text: '等待不是停滞，而是在积蓄力量。', tone: 'patient' },
  { id: 'a18', text: '等情绪平静后，再做决定。', tone: 'patient' },
  { id: 'a19', text: '变化需要一点耐心才能被看见。', tone: 'patient' },
  { id: 'a20', text: '先观察，下一个信号很重要。', tone: 'patient' },
  { id: 'a21', text: '别忽略那个让你不安的细节。', tone: 'cautious' },
  { id: 'a22', text: '现在不适合仓促答应。', tone: 'cautious' },
  { id: 'a23', text: '先确认事实，再相信猜测。', tone: 'cautious' },
  { id: 'a24', text: '留一点余地，会更安心。', tone: 'cautious' },
  { id: 'a25', text: '这件事需要更清晰的边界。', tone: 'cautious' },
  { id: 'a26', text: '不要为了赶路而选错方向。', tone: 'cautious' },
  { id: 'a27', text: '先听完另一种说法。', tone: 'cautious' },
  { id: 'a28', text: '这不是拒绝，只是需要重新考虑。', tone: 'cautious' },
  { id: 'a29', text: '把风险写下来，你会更容易判断。', tone: 'cautious' },
  { id: 'a30', text: '如果需要勉强自己，先停一下。', tone: 'cautious' },
  { id: 'a31', text: '去做第一件最小、最具体的事。', tone: 'action' },
  { id: 'a32', text: '主动开口，会比等待更有效。', tone: 'action' },
  { id: 'a33', text: '把想法变成一个今天能完成的步骤。', tone: 'action' },
  { id: 'a34', text: '机会需要你先伸出手。', tone: 'action' },
  { id: 'a35', text: '这一次，行动比完美更重要。', tone: 'action' },
  { id: 'a36', text: '直接表达真实需求。', tone: 'action' },
  { id: 'a37', text: '现在就是开始准备的好时候。', tone: 'action' },
  { id: 'a38', text: '换一种方法，局面会松动。', tone: 'action' },
  { id: 'a39', text: '先完成，再慢慢调整。', tone: 'action' },
  { id: 'a40', text: '向那个你信任的人求助。', tone: 'action' },
  { id: 'a41', text: '你第一次想到的方向值得重视。', tone: 'reflective' },
  { id: 'a42', text: '真正的问题也许不是“能不能”。', tone: 'reflective' },
  { id: 'a43', text: '想想哪种选择会让未来的你感谢现在。', tone: 'reflective' },
  { id: 'a44', text: '你已经知道答案，只是还没接受它。', tone: 'reflective' },
  { id: 'a45', text: '选择那个让你更像自己的方向。', tone: 'reflective' },
  { id: 'a46', text: '先问问自己真正害怕失去什么。', tone: 'reflective' },
  { id: 'a47', text: '别人的期待不等于你的答案。', tone: 'reflective' },
  { id: 'a48', text: '让内心的平静替你投一票。', tone: 'reflective' },
  { id: 'a49', text: '把“应该”暂时放下，再想一次。', tone: 'reflective' },
  { id: 'a50', text: '答案藏在你最舍不得放弃的地方。', tone: 'reflective' },
]

export function pickAnswer(previousId?: string): BookAnswer {
  const candidates = previousId
    ? BOOK_ANSWERS.filter((answer) => answer.id !== previousId)
    : BOOK_ANSWERS
  return candidates[Math.floor(Math.random() * candidates.length)]
}
