import { useQuery } from "vue-query";
import XpApi from "@/api/doit.forthexp.com.api";

function useAbilities(page, params, callback) {
  const fetchAbilities = async () => await XpApi
    .get("xp_ability", params)
    .then(callback)

  return useQuery( ["abilities", page, params], fetchAbilities, {
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });

}

export default useAbilities