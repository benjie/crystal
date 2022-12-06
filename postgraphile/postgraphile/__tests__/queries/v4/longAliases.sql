select __person_result__.*
from (
  select
    ids.ordinality - 1 as idx,
    (ids.value->>0)::"b"."email" as "id0"
  from json_array_elements($1::json) with ordinality as ids
) as __person_identifiers__,
lateral (
  select
    __person__."id"::text as "0",
    __person__."email" as "1",
    (select json_agg(_) from (
      select
        (count(*))::text as "0"
      from "c"."person_friends"(__person__) as __person_friends__
    ) _) as "2",
    (select json_agg(_) from (
      select
        (count(*))::text as "0"
      from "c"."person_friends"(__person__) as __person_friends__
    ) _) as "3",
    __person_identifiers__.idx as "4"
  from "c"."person" as __person__
  where (
    __person__."email" = __person_identifiers__."id0"
  )
  order by __person__."id" asc
) as __person_result__;