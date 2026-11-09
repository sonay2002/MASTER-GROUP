/* Master Group v510 — isolate all user-owned local data by Firebase UID.
   The old unscoped estimate cache is deliberately left untouched as a recovery copy. */
(()=>{
  'use strict';
  const ACCOUNT_KEYS = new Set([
    'master_group_estimates_v8','master_group_estimates_v5','master_group_estimate_drafts_v1',
    'master_group_cloud_dirty_v3','master_group_cloud_deleted_v1','master_group_deleted_estimates_v1',
    'master_group_catalog_v1','master_group_company_v1','master_group_cloud_catalog_dirty_v2',
    'master_group_cloud_profile_dirty_v2','master_group_catalog_local_updated_at','master_group_catalog_sync_at',
    'master_group_company_sync_at','master_group_notifications_v1','master_group_notifications_read_v1',
    'master_group_sync_queue_v1','master_group_sync_meta_v1','master_group_sync_conflicts_v1',
    'master_group_status_filter_v1','master_group_settings_tab_v1','master_group_data_model_version_v2','master_group_estimate_template_v1',
    'master_group_estimate_template_v2','master_group_notification_client_v1','master_group_notifications_read_v1_client','master_group_session_recovery_v1',
    'master_group_payments_v1','master_group_analytics_tab_v1','mg_analytics_tab','v59_analytics_tab','mg_counter',
    'mg_user_audit_queue_v500'
  ]);
  let currentUid='guest';
  const keyFor=(key)=>{
    const raw=String(key);
    if(!ACCOUNT_KEYS.has(raw))return raw;
    const safe=encodeURIComponent(currentUid||'guest');
    return raw+'__account_'+safe;
  };
  const setUid=(uid)=>{
    const next=String(uid||'guest');
    if(next===currentUid)return false;
    const previous=currentUid;currentUid=next;
    try{window.dispatchEvent(new CustomEvent('mg:data-scope-changed',{detail:{uid:currentUid,previousUid:previous}}));}catch(_){}
    return true;
  };
  window.__mgAccountStorageKey=keyFor;
  window.__mgSetDataAccountScope=setUid;
  window.__mgGetDataAccountScope=()=>currentUid;
  window.MGAccountDataScope={key:keyFor,set:setUid,get:()=>currentUid,version:1};
})();
