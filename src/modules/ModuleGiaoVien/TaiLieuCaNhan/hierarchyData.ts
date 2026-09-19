export interface HierarchyStore {
  [documentTitle: string]: {
    [chuongName: string]: {
      [baiName: string]: {
        [vanDeName: string]: string[]; // danh sách Chuyên đề
      };
    };
  };
}

// Làm rỗng hoàn toàn dữ liệu demo các cấp độ theo yêu cầu
export const INITIAL_HIERARCHY_DATA: HierarchyStore = {};

const STORAGE_KEY = 'lopu_teaching_hierarchy_tree_v3';

export function getStoredHierarchy(): HierarchyStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load hierarchy data:', e);
  }
  return INITIAL_HIERARCHY_DATA;
}

export function saveStoredHierarchy(data: HierarchyStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save hierarchy data:', e);
  }
}
