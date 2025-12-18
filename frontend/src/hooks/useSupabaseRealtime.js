import { useEffect } from 'react';
import { supabase } from '../services/supabase.js';

export function useSupabaseRealtime(table, event, callback) {
  useEffect(() => {
    const channel = supabase
      .channel(`${table}-changes`)
      .on(
        'postgres_changes',
        { event, schema: 'public', table },
        (payload) => callback(payload)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, event, callback]);
}

