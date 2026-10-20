import { computed, reactive } from "vue";
import { session, enterpriseData } from "./store";
import { scopedEnterprises } from "./domain";
import { industryRows, summarize } from "./industry";
export function useIndustry() {
  const filters = reactive({
    city: null,
    county: null,
    industry: null,
    search: "",
  });
  const scope = computed(() => scopedEnterprises(session.user));
  const rows = computed(() =>
    industryRows(session.user, enterpriseData, filters),
  );
  const summary = computed(() => summarize(rows.value));
  const options = computed(() => ({
    cities: [
      ...new Map(
        scope.value.map((e) => [e.cityId, { label: e.city, value: e.cityId }]),
      ).values(),
    ],
    counties: [
      ...new Map(
        scope.value
          .filter((e) => !filters.city || e.cityId === filters.city)
          .map((e) => [e.countyId, { label: e.county, value: e.countyId }]),
      ).values(),
    ],
    industries: [
      ...new Set(scope.value.map((e) => enterpriseData(e.id).info.industry)),
    ].map((s) => ({ label: s, value: s })),
  }));
  return { filters, rows, summary, options };
}
