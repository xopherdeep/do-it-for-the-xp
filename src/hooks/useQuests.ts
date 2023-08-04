import { useQuery } from "vue-query";


import XpApi from "@/api/doit.forthexp.com.api";

function useQuests(page, params) {
  return useQuery( ["tasks", page, params], fetchAchievements, {
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });

  async function fetchAchievements(){
    const response = await XpApi.get("xp_achievement", params);
    const data = response.data;
    const nTotalTasks = Number(response.headers.get("x-wp-total"));
    const nTotalPages = Number(response.headers.get("x-wp-totalpages"));
    return { data, nTotalTasks, nTotalPages };
  }
}

export default useQuests