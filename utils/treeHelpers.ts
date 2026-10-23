import { Person, Relationship } from '@/types'

export interface SpouseData {
  person: Person
  note?: string | null
}

export interface AdjacencyLists {
  spousesByPersonId: Map<string, SpouseData[]>
  childrenByPersonId: Map<string, Person[]>
  parentsByChildId: Map<string, string[]>
}

export interface ChildGroup {
  spouse: Person | null
  children: Person[]
}

export interface TreeFilterOptions {
  hideDaughtersInLaw: boolean
  hideSonsInLaw: boolean
  hideDaughters: boolean
  hideSons: boolean
  hideMales: boolean
  hideFemales: boolean
}

/**
 * Xây dựng danh sách kề (adjacency lists) cho vợ/chồng và con cái từ dữ liệu thô.
 * Giúp tối ưu truy vấn từ O(N) xuống O(1).
 */
export function buildAdjacencyLists(
  relationships: Relationship[],
  personsMap: Map<string, Person>
): AdjacencyLists {
  const spouses = new Map<string, SpouseData[]>()
  const children = new Map<string, Person[]>()
  const parents = new Map<string, string[]>()

  relationships.forEach((r) => {
    if (r.type === 'marriage') {
      if (!spouses.has(r.person_a)) spouses.set(r.person_a, [])
      if (!spouses.has(r.person_b)) spouses.set(r.person_b, [])

      const pB = personsMap.get(r.person_b)
      if (pB) spouses.get(r.person_a)?.push({ person: pB, note: r.note })

      const pA = personsMap.get(r.person_a)
      if (pA) spouses.get(r.person_b)?.push({ person: pA, note: r.note })
    } else if (r.type === 'biological_child' || r.type === 'adopted_child') {
      if (!children.has(r.person_a)) children.set(r.person_a, [])
      const child = personsMap.get(r.person_b)
      if (child) children.get(r.person_a)?.push(child)
      if (!parents.has(r.person_b)) parents.set(r.person_b, [])
      parents.get(r.person_b)?.push(r.person_a)
    }
  })

  // Sắp xếp con cái theo thứ tự sinh hoặc năm sinh
  children.forEach((childArray) => {
    childArray.sort((a, b) => {
      const aOrder = a.birth_order ?? Infinity
      const bOrder = b.birth_order ?? Infinity
      if (aOrder !== bOrder) return aOrder - bOrder
      const aYear = a.birth_year ?? Infinity
      const bYear = b.birth_year ?? Infinity
      return aYear - bYear
    })
  })

  return {
    spousesByPersonId: spouses,
    childrenByPersonId: children,
    parentsByChildId: parents
  }
}

/**
 * Lấy dữ liệu của một node trong cây (vợ chồng, con cái) đã qua bộ lọc.
 */
export function getFilteredTreeData(
  personId: string,
  personsMap: Map<string, Person>,
  adj: AdjacencyLists,
  filters: TreeFilterOptions
) {
  const {
    hideDaughtersInLaw,
    hideSonsInLaw,
    hideDaughters,
    hideSons,
    hideMales,
    hideFemales
  } = filters

  let spousesList = adj.spousesByPersonId.get(personId) || []
  spousesList = spousesList.filter((s) => {
    if (hideDaughtersInLaw && s.person.gender === 'female') return false
    if (hideSonsInLaw && s.person.gender === 'male') return false
    if (hideMales && s.person.gender === 'male') return false
    if (hideFemales && s.person.gender === 'female') return false
    return true
  })

  let childrenList = adj.childrenByPersonId.get(personId) || []
  childrenList = childrenList.filter((c) => {
    if (hideDaughters && c.gender === 'female') return false
    if (hideSons && c.gender === 'male') return false
    if (hideMales && c.gender === 'male') return false
    if (hideFemales && c.gender === 'female') return false
    return true
  })

  // Khi một người có từ 2 vợ/chồng trở lên, gom con theo từng người
  // vợ/chồng (dựa vào liên kết cha/mẹ còn lại của mỗi người con) để cây
  // thể hiện rõ con là của bà/ông nào. Thứ tự nhóm đi theo thứ tự
  // vợ/chồng; nhóm con chưa rõ cha/mẹ còn lại xếp cuối.
  let childGroups: ChildGroup[] | null = null
  if (spousesList.length >= 2 && childrenList.length > 0) {
    const spouseIds = new Set(spousesList.map((s) => s.person.id))
    const bySpouse = new Map<string | null, Person[]>()
    childrenList.forEach((c) => {
      const parentIds = adj.parentsByChildId.get(c.id) || []
      const coParentId =
        parentIds.find((pid) => pid !== personId && spouseIds.has(pid)) ??
        null
      if (!bySpouse.has(coParentId)) bySpouse.set(coParentId, [])
      bySpouse.get(coParentId)!.push(c)
    })
    childGroups = spousesList
      .filter((s) => bySpouse.has(s.person.id))
      .map((s) => ({
        spouse: s.person,
        children: bySpouse.get(s.person.id)!
      }))
    if (bySpouse.has(null)) {
      childGroups.push({ spouse: null, children: bySpouse.get(null)! })
    }
  }

  return {
    person: personsMap.get(personId)!,
    spouses: spousesList,
    children: childrenList,
    childGroups
  }
}

/** Person IDs whose branches start collapsed for the given auto-collapse level. */
export function computeAutoCollapsed(
  roots: { id: string }[],
  childrenByPersonId: Map<string, { id: string }[]>,
  autoCollapseLevel: number
): Set<string> {
  const collapsed = new Set<string>()
  if (autoCollapseLevel <= 0) return collapsed

  const visited = new Set<string>()
  const walk = (personId: string, level: number) => {
    if (visited.has(personId)) return
    visited.add(personId)

    const children = childrenByPersonId.get(personId) ?? []
    if (level >= autoCollapseLevel && children.length > 0) {
      collapsed.add(personId)
    }
    children.forEach((child) => walk(child.id, level + 1))
  }

  roots.forEach((root) => walk(root.id, 0))
  return collapsed
}

/**
 * Normalizes each tree level's node heights so rows align. The resize/zoom
 * wiring lives in the component; this is the pure DOM pass.
 */
export function equalizeNodeHeights(container: HTMLElement) {
  const nodes = container.querySelectorAll('.node-container')
  const levelMap: Record<string, HTMLElement[]> = {}

  nodes.forEach((node) => {
    const level = node.getAttribute('data-level')
    if (level != null) {
      if (!levelMap[level]) levelMap[level] = []
      levelMap[level].push(node as HTMLElement)
    }
  })

  Object.values(levelMap).forEach((levelNodes) => {
    // Reset min-height first to get natural height
    levelNodes.forEach((node) => {
      const innerFlex = node.firstElementChild as HTMLElement
      if (innerFlex) innerFlex.style.minHeight = '0px'
    })

    let maxHeight = 0
    // Find the maximum height in this level
    levelNodes.forEach((node) => {
      const innerFlex = node.firstElementChild as HTMLElement
      if (innerFlex) {
        maxHeight = Math.max(maxHeight, innerFlex.offsetHeight)
      }
    })

    // Apply max height to all nodes in this level
    levelNodes.forEach((node) => {
      const innerFlex = node.firstElementChild as HTMLElement
      if (innerFlex && maxHeight > 0) {
        innerFlex.style.minHeight = `${maxHeight}px`
      }
    })
  })
}
