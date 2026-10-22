'use client'

import { ArrowRight, CalendarDays, Shield, User } from 'lucide-react'
import Link from 'next/link'
import { useActionState } from 'react'

import config from '@/app/config'
import Footer from '@/components/Footer'

import { enterWithNameAndBirthYear, type GateState } from './actions'

const initialState: GateState = {}

const inputClasses =
  'block w-full rounded-xl border border-stone-200/80 bg-white/50 py-3.5 pr-4 pl-11 text-sm text-stone-900 placeholder-stone-400 transition duration-200 outline-none focus:border-amber-400 focus:bg-white focus:ring-amber-400'

export default function FamilyGatePage() {
  const [state, formAction, pending] = useActionState(
    enterWithNameAndBirthYear,
    initialState
  )

  return (
    <div className='relative flex min-h-screen flex-col bg-neutral font-sans text-primary'>
      <main className='relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-16'>
        <div className='w-full max-w-md rounded-3xl bg-white p-8 shadow-soft sm:p-10'>
          <div className='mb-8 text-center'>
            <span className='mb-5 inline-flex items-center justify-center rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-stone-100'>
              <Shield className='size-8 text-amber-600' />
            </span>
            <h1 className='font-serif text-3xl font-semibold text-stone-900'>
              Vào xem gia phả
            </h1>
            <p className='mt-3 text-sm leading-relaxed text-stone-600'>
              Người thân trong họ không cần tài khoản. Chỉ cần nhập{' '}
              <span className='font-medium text-stone-800'>
                họ tên của một người trong gia phả
              </span>{' '}
              và{' '}
              <span className='font-medium text-stone-800'>
                năm sinh của người đó
              </span>{' '}
              là vào xem được ngay.
            </p>
          </div>

          <form action={formAction} className='space-y-5'>
            <div className='relative'>
              <label
                htmlFor='fullName'
                className='mb-1.5 ml-1 block text-sm font-medium text-stone-600'>
                Họ và tên
              </label>
              <div className='group relative flex items-center'>
                <span className='absolute left-3.5 size-5 text-stone-400 transition-colors group-focus-within:text-amber-500'>
                  <User className='size-5' />
                </span>
                <input
                  id='fullName'
                  name='fullName'
                  type='text'
                  required
                  autoComplete='name'
                  placeholder='Ví dụ: Nguyễn Trọng Khuông'
                  className={inputClasses}
                />
              </div>
            </div>

            <div className='relative'>
              <label
                htmlFor='birthYear'
                className='mb-1.5 ml-1 block text-sm font-medium text-stone-600'>
                Năm sinh
              </label>
              <div className='group relative flex items-center'>
                <span className='absolute left-3.5 size-5 text-stone-400 transition-colors group-focus-within:text-amber-500'>
                  <CalendarDays className='size-5' />
                </span>
                <input
                  id='birthYear'
                  name='birthYear'
                  type='number'
                  required
                  inputMode='numeric'
                  min={1800}
                  max={2100}
                  placeholder='Ví dụ: 1929'
                  className={inputClasses}
                />
              </div>
            </div>

            {state.error && (
              <div className='rounded-xl border border-red-100/50 bg-red-50 p-3 text-center text-sm font-medium text-red-700'>
                {state.error}
              </div>
            )}

            <button
              type='submit'
              disabled={pending}
              className='group relative flex w-full items-center justify-center gap-2 rounded-xl border border-stone-800 bg-stone-900 px-4 py-4 text-sm font-medium text-white transition duration-300 hover:-translate-y-0.5 hover:bg-stone-800 focus:ring-2 focus:ring-stone-900 focus:ring-offset-2 focus:outline-none disabled:cursor-wait disabled:opacity-70'>
              {pending ? 'Đang kiểm tra…' : 'Vào xem gia phả'}
              {!pending && (
                <ArrowRight className='size-4 transition-transform group-hover:translate-x-1' />
              )}
            </button>
          </form>

          <p className='mt-6 text-center text-sm text-stone-500'>
            Đã có tài khoản thành viên?{' '}
            <Link
              href='/login'
              className='font-medium text-amber-700 underline decoration-amber-400 underline-offset-2 hover:text-amber-800'>
              Đăng nhập tại đây
            </Link>
          </p>
        </div>

        <p className='mt-6 font-serif text-sm font-semibold text-stone-500'>
          {config.siteName}
        </p>
      </main>

      <Footer className='relative z-10 mt-auto border-t border-stone-200 bg-white' />
    </div>
  )
}
