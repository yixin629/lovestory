export interface AnniversaryDateInput {
  date: string
  recurring: boolean
}

export interface AnniversaryOccurrence {
  date: Date
  daysUntil: number
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

export const parseLocalDate = (value: string): Date | null => {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number)
  if (!year || !month || !day) return null

  const date = new Date(year, month - 1, day)
  return Number.isNaN(date.getTime()) ? null : date
}

export const getUpcomingAnniversaryOccurrence = (
  anniversary: AnniversaryDateInput,
  referenceDate = new Date()
): AnniversaryOccurrence | null => {
  const anniversaryDate = parseLocalDate(anniversary.date)
  if (!anniversaryDate) return null

  const today = new Date(referenceDate)
  today.setHours(0, 0, 0, 0)

  let occurrence = new Date(anniversaryDate)

  if (anniversary.recurring) {
    occurrence = new Date(
      today.getFullYear(),
      anniversaryDate.getMonth(),
      anniversaryDate.getDate()
    )

    if (occurrence < today) {
      occurrence.setFullYear(today.getFullYear() + 1)
    }
  } else if (occurrence < today) {
    return null
  }

  occurrence.setHours(0, 0, 0, 0)

  return {
    date: occurrence,
    daysUntil: Math.round((occurrence.getTime() - today.getTime()) / MS_PER_DAY),
  }
}
