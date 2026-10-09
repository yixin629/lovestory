/** 头像可能是图片 URL 或 emoji；图片按当前字号缩放 */
export default function PlayerAvatar({ avatar, fallback }: { avatar: string | undefined; fallback: string }) {
  const value = avatar || fallback
  if (value.startsWith('http')) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={value} alt="头像" width={40} height={40} loading="lazy" className="inline-block h-[1em] w-[1em] rounded-full object-cover" />
  }
  return <>{value}</>
}
