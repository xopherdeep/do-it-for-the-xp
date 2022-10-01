import { useQuery } from "vue-query";
import XpApi from "@/api/doit.forthexp.com.api";

function useQuests(page, params, callback) {
  const fetchAchievements = async () => await XpApi
    .get("xp_achievement", params)
    .then(callback)

  return useQuery( ["tasks", page, params], fetchAchievements, {
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });

}

export default useQuests