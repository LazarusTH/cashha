// Enhance admin action logging
export async function logAdminAction(
  supabase: any,
  adminId: string,
  userId: string,
  action: string,
  details: any,
  headers?: Headers
) {
  return await supabase
    .from('admin_audit_logs')
    .insert({
      admin_id: adminId,
      user_id: userId,
      action,
      details,
      ip_address: headers?.get('x-forwarded-for') || 'unknown',
      user_agent: headers?.get('user-agent') || 'unknown'
    })
}

