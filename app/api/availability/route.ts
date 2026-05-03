import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getAvailableSlots } from '@/lib/availability'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const practitionerId = searchParams.get('practitionerId')
  const serviceId = searchParams.get('serviceId')
  const date = searchParams.get('date')

  if (!practitionerId || !serviceId || !date) {
    return NextResponse.json({ error: 'Missing required params' }, { status: 400 })
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
  }

  // Reject dates in the past
  if (date < new Date().toISOString().split('T')[0]) {
    return NextResponse.json({ slots: [] })
  }

  try {
    const supabase = await createServerSupabaseClient()

    const [practitionerRes, serviceRes, rulesRes, blockedRes, apptRes] =
      await Promise.all([
        supabase
          .from('practitioners')
          .select('buffer_minutes')
          .eq('id', practitionerId)
          .single(),
        supabase
          .from('services')
          .select('duration_minutes')
          .eq('id', serviceId)
          .eq('practitioner_id', practitionerId)
          .eq('is_active', true)
          .single(),
        supabase
          .from('availability_rules')
          .select('*')
          .eq('practitioner_id', practitionerId),
        supabase
          .from('blocked_times')
          .select('*')
          .eq('practitioner_id', practitionerId),
        supabase
          .from('appointments')
          .select('*')
          .eq('practitioner_id', practitionerId)
          .gte('start_time', `${date}T00:00:00`)
          .lte('start_time', `${date}T23:59:59`)
          .neq('status', 'cancelled'),
      ])

    if (!serviceRes.data) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    const bufferMinutes =
      (practitionerRes.data as never as { buffer_minutes?: number })?.buffer_minutes ?? 0

    const slots = getAvailableSlots({
      date,
      rules: rulesRes.data ?? [],
      blockedTimes: blockedRes.data ?? [],
      appointments: apptRes.data ?? [],
      durationMinutes: serviceRes.data.duration_minutes,
      bufferMinutes,
    })

    return NextResponse.json({ slots })
  } catch (err) {
    console.error('[availability API]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
