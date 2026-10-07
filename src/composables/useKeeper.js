import { computed, reactive } from 'vue'
import { createStorage } from '../services/storage'
import { config, seed, legacyCookStatus } from '../data'

const storage = createStorage(config.storageKey, seed)
// 旧模板留下的状态（借用中/已归还/完成）统一迁移到烹饪状态流转
function migrateUsages(state) {
  let changed = false
  state.usages = state.usages.map((entry) => {
    const status = legacyCookStatus[entry.status] || entry.status || '已完成'
    if (status !== entry.status) changed = true
    return { ...entry, status }
  })
  if (changed) storage.write(state)
}
export function useKeeper() {
  const state = reactive(storage.read())
  migrateUsages(state)
  const persist = () => storage.write(state)
  const add = (collection, item) => { state[collection].unshift({ id: `${collection}-${Date.now()}`, createdAt: new Date().toISOString(), ...item }); persist() }
  const update = (collection, id, patch) => { const item = state[collection].find((entry) => entry.id === id); if (item) Object.assign(item, patch); persist() }
  const remove = (collection, id) => { state[collection] = state[collection].filter((entry) => entry.id !== id); persist() }
  const reset = () => { Object.assign(state, structuredClone(seed)); persist() }
  const metrics = computed(() => config.metrics.map((metric) => ({ ...metric, value: metric.value ? metric.value(state) : state[metric.collection]?.length || 0 })))
  return { state, add, update, remove, reset, persist, metrics }
}
