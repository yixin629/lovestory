import type { Point } from '../types'
import { WORLD_SIZE, isBlocked } from './world'

const GRID_SIZE = 55
const GRID_COUNT = Math.ceil(WORLD_SIZE / GRID_SIZE)

function key(x: number, y: number) {
  return `${x},${y}`
}

function toGrid(point: Point) {
  return {
    x: Math.max(0, Math.min(GRID_COUNT - 1, Math.round(point.x / GRID_SIZE))),
    y: Math.max(0, Math.min(GRID_COUNT - 1, Math.round(point.y / GRID_SIZE))),
  }
}

function toWorld(point: Point): Point {
  return {
    x: Math.max(20, Math.min(WORLD_SIZE - 20, point.x * GRID_SIZE)),
    y: Math.max(45, Math.min(WORLD_SIZE - 20, point.y * GRID_SIZE)),
  }
}

function nearestOpenCell(point: Point) {
  const origin = toGrid(point)
  if (!isBlocked(toWorld(origin))) return origin
  for (let radius = 1; radius <= 5; radius += 1) {
    for (let y = origin.y - radius; y <= origin.y + radius; y += 1) {
      for (let x = origin.x - radius; x <= origin.x + radius; x += 1) {
        const candidate = { x, y }
        if (x >= 0 && y >= 0 && x < GRID_COUNT && y < GRID_COUNT && !isBlocked(toWorld(candidate))) return candidate
      }
    }
  }
  return origin
}

export function buildNavigationPath(from: Point, to: Point) {
  const start = nearestOpenCell(from)
  const goal = nearestOpenCell(to)
  const open = [start]
  const cameFrom = new Map<string, Point>()
  const cost = new Map([[key(start.x, start.y), 0]])
  const visited = new Set<string>()
  const directions = [
    { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
    { x: 1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: -1, y: -1 },
  ]

  while (open.length > 0) {
    open.sort((left, right) => {
      const leftCost = cost.get(key(left.x, left.y)) ?? Infinity
      const rightCost = cost.get(key(right.x, right.y)) ?? Infinity
      return leftCost + Math.hypot(goal.x - left.x, goal.y - left.y)
        - rightCost - Math.hypot(goal.x - right.x, goal.y - right.y)
    })
    const current = open.shift()
    if (!current) break
    const currentKey = key(current.x, current.y)
    if (visited.has(currentKey)) continue
    visited.add(currentKey)
    if (current.x === goal.x && current.y === goal.y) {
      const path: Point[] = [{ ...to }]
      let cursor = current
      while (key(cursor.x, cursor.y) !== key(start.x, start.y)) {
        path.unshift(toWorld(cursor))
        const previous = cameFrom.get(key(cursor.x, cursor.y))
        if (!previous) break
        cursor = previous
      }
      return path
    }

    for (const direction of directions) {
      const next = { x: current.x + direction.x, y: current.y + direction.y }
      if (next.x < 0 || next.y < 0 || next.x >= GRID_COUNT || next.y >= GRID_COUNT || isBlocked(toWorld(next))) continue
      const nextKey = key(next.x, next.y)
      const nextCost = (cost.get(currentKey) ?? 0) + (direction.x && direction.y ? 1.414 : 1)
      if (nextCost >= (cost.get(nextKey) ?? Infinity)) continue
      cost.set(nextKey, nextCost)
      cameFrom.set(nextKey, current)
      open.push(next)
    }
  }
  return [{ ...to }]
}
