import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';
import { DEFAULT_CDC_DB } from '../data/schemaDB';

// ==========================================
// 🧠 Runtime Schema Patcher
// ==========================================
const patchSchemaWithAggregateFields = (schema) => {
  if (!schema || !schema.sections || !schema.rules) {
    console.warn('⚠️ PATCH SKIPPED: Invalid schema', schema?.system_id);
    return schema;
  }
  
  const patched = JSON.parse(JSON.stringify(schema));
  
  const allCheckboxFields = new Set();
  
  const collectAllCheckboxes = (fields) => {
    if (!fields) return;
    fields.forEach(field => {
      if (field.type === 'checkbox') {
        allCheckboxFields.add(field.id);
      }
      if (field.children) collectAllCheckboxes(field.children);
    });
  };
  
  patched.sections.forEach(section => collectAllCheckboxes(section.fields));
  
  const guessFieldsFromPrefix = (fieldName) => {
    const prefixMap = {
      'card_symptoms_selected': 'card_symp_',
      'endo_infant_symptoms_selected': 'endo_symp_',
      'med_symptoms_selected': 'med_symp_',
      'vasc_symptoms_selected': 'vasc_symp_',
      'conj_symptoms_selected': 'conj_symp_',
      'eye_symptoms_selected': 'eye_symp_',
      'ear_symptoms_selected': 'ear_symp_',
      'mast_symptoms_selected': 'mast_symp_',
      'sinu_symptoms_selected': 'sinu_symp_',
      'ur_symptoms_selected': 'ur_symp_',
      'pneu_symptoms_adult_selected': 'pneu_symp_',
      'pneu_symptoms_infant_selected': 'pneu_symp_',
      'pneu_symptoms_pnu3_selected': 'pneu_symp_',
      'bron_symptoms_selected': 'bron_symp_',
      'lung_symptoms_selected': 'lung_symp_',
      'trach_symptoms_selected': 'trach_symp_',
    };
    
    const prefix = prefixMap[fieldName];
    if (prefix) {
      return [...allCheckboxFields].filter(id => id.startsWith(prefix));
    }
    return [];
  };
  
  let patchCount = 0;
  
  const patchNode = (node) => {
    if (!node) return;
    
    if (node.type === 'min_count' && node.field && !node.fields) {
      const guessedFields = guessFieldsFromPrefix(node.field);
      
      if (guessedFields.length > 0) {
        delete node.field;
        node.fields = guessedFields;
        patchCount++;
      }
    }
    
    if (node.conditions) node.conditions.forEach(patchNode);
    if (node.criteria) node.criteria.forEach(patchNode);
  };
  
  patched.rules?.disease_paths?.forEach(path => {
    if (path.criteria) path.criteria.forEach(patchNode);
  });
  
  return patched;
};

// ==========================================
// 🪝 Main Hook
// ==========================================
export function useAppData(currentUser) {
  const [wards, setWards] = useState([]);
  const [systemUsers, setSystemUsers] = useState([]);
  const [cdcConfig, setCdcConfig] = useState(DEFAULT_CDC_DB);
  const [assessments, setAssessments] = useState([]);
  const [systemCategories, setSystemCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [viewedCases, setViewedCases] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('ic_viewed_cases') || '{}');
    } catch {
      return {};
    }
  });

  // ==========================================
  // Fetch Global Data
  // ==========================================
  const fetchGlobalData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [wardsRes, usersRes, configRes] = await Promise.all([
        supabase.from('wards').select('*').order('id'),
        supabase.from('system_users').select('*').order('id'),
        supabase.from('cdc_configs').select('*').order('sort_order', { ascending: true })
      ]);

      if (wardsRes.data) setWards(wardsRes.data);
      
      // ✅ เพิ่ม ward_name ให้ users
      if (usersRes.data) {
        const usersWithWard = usersRes.data.map(u => ({
          ...u,
          ward_name: wardsRes.data?.find(w => w.id === u.ward_id)?.name || null
        }));
        setSystemUsers(usersWithWard);
      }
      
      if (configRes.data && configRes.data.length > 0) {
        const cloudDb = {};
        
        const categories = configRes.data.map(item => ({
          id: item.system_id,
          name: item.name,
          short_name: item.short_name || null,
          sort_order: item.sort_order || 0
        }));
        setSystemCategories(categories);
        
        configRes.data.forEach(item => { 
          const patched = patchSchemaWithAggregateFields(item);
          patched.sort_order = item.sort_order || 0;
          patched.short_name = item.short_name || null;
          cloudDb[item.system_id] = patched; 
        });
        
        setCdcConfig(cloudDb);
      } else {
        const defaultCategories = Object.values(DEFAULT_CDC_DB).map((item, index) => ({
          id: item.system_id,
          name: item.name,
          short_name: item.short_name || null,
          sort_order: index
        }));
        setSystemCategories(defaultCategories);
      }
    } catch (error) {
      console.error("Error fetching global data:", error);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  // ==========================================
  // Fetch Assessments
  // ==========================================
  const fetchAssessments = useCallback(async () => {
    if (!currentUser) return;
    try {
      const orderColumn = currentUser.role === 'NURSE' ? 'updated_at' : 'created_at';
      
      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .in('status', ['Pending', 'Confirmed', 'POA', 'Discarded'])
        .order(orderColumn, { ascending: false });
        
      if (data && !error) {
        const filteredData = currentUser.role === 'NURSE' && currentUser.ward_id 
          ? data.filter(c => c.ward_id === currentUser.ward_id) 
          : data;
        setAssessments(filteredData);
      }
    } catch (error) {
      console.error("Error fetching assessments:", error);
    }
  }, [currentUser]);

  // ==========================================
  // Viewed Cases Functions
  // ==========================================
  const markCaseAsViewed = useCallback((caseId) => {
    setViewedCases(prev => {
      const updated = { ...prev, [caseId]: Date.now() };
      localStorage.setItem('ic_viewed_cases', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const isCaseNew = useCallback((caseId, lastUpdated) => {
    const viewedAt = viewedCases[caseId];
    if (!viewedAt) return true;
    const caseTime = new Date(lastUpdated).getTime();
    return caseTime > viewedAt;
  }, [viewedCases]);

  // ==========================================
  // Initial Load
  // ==========================================
  useEffect(() => {
    fetchGlobalData();
  }, [fetchGlobalData]);

  // ==========================================
  // Realtime Subscription
  // ==========================================
  useEffect(() => {
    if (!currentUser) return;
    
    fetchAssessments();

    const channelName = `assessments-realtime-${currentUser?.id || 'anon'}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'assessments' },
        () => {
          fetchAssessments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, fetchAssessments]);

  // ==========================================
  // Return
  // ==========================================
  return { 
    wards, 
    systemUsers, 
    cdcConfig, 
    assessments, 
    systemCategories,
    loading, 
    fetchGlobalData, 
    fetchAssessments,
    setCdcConfig,
    viewedCases,
    markCaseAsViewed,
    isCaseNew
  };
}