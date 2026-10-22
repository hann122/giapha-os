'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { getAdminSupabase } from '@/utils/supabase/admin'
import { getSupabase } from '@/utils/supabase/queries'

/**
 * Cổng vào xem gia phả cho người thân (không cần tài khoản):
 * khách nhập HỌ TÊN + NĂM SINH của một người bất kỳ trong cây gia phả.
 * Nếu khớp, máy chủ đăng nhập hộ bằng tài khoản guest dùng chung
 * (GATE_GUEST_EMAIL / GATE_GUEST_PASSWORD) rồi chuyển vào /dashboard.
 *
 * Đây là "cổng mềm" dành cho người nhà, không phải cơ chế bảo mật mạnh:
 * ai biết đúng một cặp (họ tên, năm sinh) trong cây đều vào xem được.
 * Tài khoản guest bắt buộc là tài khoản Member chỉ-xem và đã được kích hoạt.
 */

export type GateState = { error?: string }

const GENERIC_ERROR =
  'Thông tin chưa khớp. Xin kiểm tra lại họ tên và năm sinh rồi thử lại.'
const LOCKOUT_ERROR =
  'Bạn đã thử chưa khớp quá nhiều lần. Xin đợi khoảng 15 phút rồi thử lại.'

// ---------------------------------------------------------------------------
// Giới hạn số lần thử sai theo IP (lưu trong bộ nhớ của tiến trình máy chủ).
// Hàm serverless có thể được tái tạo nên bộ đếm này chỉ là "gờ giảm tốc"
// chống dò đoán hàng loạt, kết hợp với độ trễ sau mỗi lần sai ở dưới.
// ---------------------------------------------------------------------------
const MAX_FAILURES = 5
const WINDOW_MS = 15 * 60 * 1000
const failures = new Map<string, { count: number; resetAt: number }>()

function isLockedOut(ip: string): boolean {
  const entry = failures.get(ip)
  if (!entry) return false
  if (Date.now() > entry.resetAt) {
    failures.delete(ip)
    return false
  }
  return entry.count >= MAX_FAILURES
}

function recordFailure(ip: string) {
  const now = Date.now()
  const entry = failures.get(ip)
  if (!entry || now > entry.resetAt) {
    failures.set(ip, { count: 1, resetAt: now + WINDOW_MS })
  } else {
    entry.count += 1
  }
}

/** Chuẩn hoá họ tên để so khớp: bỏ dấu tiếng Việt, thường hoá, gọn khoảng trắng. */
function normalizeName(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export async function enterWithNameAndBirthYear(
  _prevState: GateState,
  formData: FormData
): Promise<GateState> {
  const headerStore = await headers()
  const ip =
    headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

  if (isLockedOut(ip)) {
    return { error: LOCKOUT_ERROR }
  }

  const fail = async (): Promise<GateState> => {
    recordFailure(ip)
    // Trả lời chậm dần sau mỗi lần sai để việc dò đoán hàng loạt trở nên tốn kém.
    await new Promise((resolve) => setTimeout(resolve, 1200))
    return { error: GENERIC_ERROR }
  }

  const fullName = formData.get('fullName')?.toString() ?? ''
  const birthYear = Number.parseInt(
    formData.get('birthYear')?.toString() ?? '',
    10
  )
  const currentYear = new Date().getFullYear()

  if (
    !fullName.trim() ||
    !Number.isInteger(birthYear) ||
    birthYear < 1800 ||
    birthYear > currentYear
  ) {
    return fail()
  }

  const guestEmail = process.env.GATE_GUEST_EMAIL
  const guestPassword = process.env.GATE_GUEST_PASSWORD
  if (!guestEmail || !guestPassword) {
    console.error(
      'Cổng vào: chưa cấu hình GATE_GUEST_EMAIL / GATE_GUEST_PASSWORD.'
    )
    return { error: GENERIC_ERROR }
  }

  // 1) Đối chiếu cặp (họ tên, năm sinh) với bảng persons bằng service role
  //    (chỉ chạy trên máy chủ, không lộ dữ liệu ra ngoài).
  let matched = false
  try {
    const admin = getAdminSupabase()
    const { data: candidates, error } = await admin
      .from('persons')
      .select('full_name')
      .eq('birth_year', birthYear)

    if (error) throw error

    const target = normalizeName(fullName)
    matched = (candidates ?? []).some(
      (person) => normalizeName(person.full_name as string) === target
    )
  } catch (err) {
    console.error('Cổng vào: lỗi khi đối chiếu dữ liệu:', err)
    return { error: GENERIC_ERROR }
  }

  if (!matched) {
    return fail()
  }

  // 2) Đăng nhập hộ bằng tài khoản guest — cookie phiên được cấp qua
  //    Supabase SSR client ngay trên domain của web, như đăng nhập thường.
  const supabase = await getSupabase()
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: guestEmail,
    password: guestPassword
  })

  if (signInError) {
    console.error('Cổng vào: đăng nhập guest thất bại:', signInError.message)
    return { error: GENERIC_ERROR }
  }

  failures.delete(ip)
  redirect('/dashboard/members')
}
