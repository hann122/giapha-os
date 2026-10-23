'use client'

import { Minus, Plus } from 'lucide-react'
import React from 'react'

import { useI18n } from '@/lib/i18n/useI18n'
import { Person } from '@/types'

import FamilyNodeCard from './FamilyNodeCard'

interface TreeData {
  person: Person | null
  spouses: { person: Person }[]
  children: { id: string }[]
  childGroups: { spouse: Person | null; children: Person[] }[] | null
  currentSpouseId: string | null
}

/** Tên gọi chính (từ cuối của họ tên đầy đủ). */
function givenName(person: Person): string {
  const parts = person.full_name.trim().split(/\s+/)
  return parts[parts.length - 1]
}

/** Nhãn nhóm con theo cặp cha mẹ, VD: "Con ông Tạo bà Liên". */
function buildGroupLabel(person: Person, spouse: Person | null): string {
  if (!spouse) {
    return person.gender === 'male'
      ? `Con ông ${givenName(person)}`
      : `Con bà ${givenName(person)}`
  }
  const husband =
    person.gender === 'male'
      ? person
      : spouse.gender === 'male'
        ? spouse
        : null
  const wife =
    person.gender === 'female'
      ? person
      : spouse.gender === 'female'
        ? spouse
        : null
  if (!husband && !wife) {
    return `Con của ${givenName(person)} và ${givenName(spouse)}`
  }
  let label = 'Con'
  if (husband) label += ` ông ${givenName(husband)}`
  if (wife) label += ` bà ${givenName(wife)}`
  return label
}

interface FamilyTreeNodeRendererProps {
  roots: Person[]
  getTreeData: (personId: string) => TreeData
  collapsedNodes: Set<string>
  showAvatar: boolean
  hideExpandButtons: boolean
  toggleCollapse: (personId: string) => void
}

/** Recursively renders the CSS-tree node list. */
export default function FamilyTreeNodeRenderer({
  roots,
  getTreeData,
  collapsedNodes,
  showAvatar,
  hideExpandButtons,
  toggleCollapse
}: FamilyTreeNodeRendererProps) {
  const { t } = useI18n()

  // Tracks visited IDs to prevent infinite loops from circular relationships
  const renderTreeNode = (
    personId: string,
    visited: Set<string>,
    level: number
  ): React.ReactNode => {
    if (visited.has(personId)) return null // cycle guard
    visited.add(personId)

    const data = getTreeData(personId)
    if (!data.person) return null

    const hasChildren = data.children.length > 0
    const isCollapsed = collapsedNodes.has(personId)

    // Từ 2 vợ/chồng trở lên: người chính ở giữa, vợ/chồng đầu tiên ở
    // bên trái, người thứ hai ở bên phải (các người tiếp theo tỏa dần
    // ra hai phía) để bà/ông nào cũng kề bên người chính.
    let leftSpouses = data.spouses.slice(0, 0)
    let rightSpouses = data.spouses
    if (data.spouses.length >= 2) {
      leftSpouses = data.spouses.filter((_, i) => i % 2 === 0).reverse()
      rightSpouses = data.spouses.filter((_, i) => i % 2 === 1)
    }
    const renderSpouse = (spouseData: { person: Person }) => (
      <div key={spouseData.person.id} className='relative flex'>
        <FamilyNodeCard
          isRingVisible={spouseData.person.id === data.currentSpouseId}
          isPlusVisible={spouseData.person.id !== data.currentSpouseId}
          person={spouseData.person}
          level={level}
        />
      </div>
    )

    return (
      <li>
        <div
          className='node-container inline-flex flex-col items-center'
          data-level={level}>
          {/* Main Person & Spouses Row */}
          <div
            className={`relative z-10 flex h-full items-stretch ${showAvatar ? 'rounded-2xl border border-stone-200/80 bg-white' : ''}`}>
            {leftSpouses.map(renderSpouse)}

            <FamilyNodeCard person={data.person} level={level} />

            {rightSpouses.map(renderSpouse)}

            {/* Expand/Collapse Toggle – centered on the row */}
            {!hideExpandButtons && hasChildren && (
              <button
                type='button'
                onClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  toggleCollapse(personId)
                }}
                className='absolute -bottom-3 left-1/2 z-100 flex size-6 -translate-x-1/2 items-center justify-center rounded-full border border-stone-200/80 bg-white text-stone-500 transition-colors hover:border-amber-300 hover:text-amber-600'
                title={isCollapsed ? t('expand') : t('collapse')}
                aria-label={isCollapsed ? t('expand') : t('collapse')}
                aria-expanded={!isCollapsed}>
                {isCollapsed ? (
                  <Plus className='h-3.5 w-3.5' />
                ) : (
                  <Minus className='h-3.5 w-3.5' />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Render Children (if any and not collapsed) */}
        {hasChildren && !isCollapsed && data.childGroups && (
          <ul>
            {data.childGroups.map((group) => (
              <li key={group.spouse?.id ?? 'other'}>
                <div className='flex justify-center'>
                  <span className='inline-block rounded-full border border-stone-200 bg-white px-3 py-1 text-sm font-medium whitespace-nowrap text-amber-600'>
                    {buildGroupLabel(data.person!, group.spouse)}
                  </span>
                </div>
                <ul>
                  {group.children.map((child) => (
                    <React.Fragment key={child.id}>
                      {renderTreeNode(child.id, new Set(visited), level + 1)}
                    </React.Fragment>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
        {hasChildren && !isCollapsed && !data.childGroups && (
          <ul>
            {data.children.map((child) => (
              <React.Fragment key={child.id}>
                {renderTreeNode(child.id, new Set(visited), level + 1)}
              </React.Fragment>
            ))}
          </ul>
        )}
      </li>
    )
  }

  return roots.map((root) => (
    <React.Fragment key={root.id}>
      {renderTreeNode(root.id, new Set(), 0)}
    </React.Fragment>
  ))
}
