select __range_test_result__.*
from (
  select
    ids.ordinality - 1 as idx,
    (ids.value->>0)::"int4" as "id0"
  from json_array_elements($1::json) with ordinality as ids
) as __range_test_identifiers__,
lateral (
  select
    json_build_array(
      lower_inc(__range_test__."tstz"),
      to_char(lower(__range_test__."tstz"), 'YYYY-MM-DD"T"HH24:MI:SS.USTZHTZM'::text),
      to_char(upper(__range_test__."tstz"), 'YYYY-MM-DD"T"HH24:MI:SS.USTZHTZM'::text),
      upper_inc(__range_test__."tstz")
    )::text as "0",
    __range_test__."id"::text as "1",
    __range_test_identifiers__.idx as "2"
  from "ranges"."range_test" as __range_test__
  where (
    __range_test__."id" = __range_test_identifiers__."id0"
  )
  order by __range_test__."id" asc
) as __range_test_result__