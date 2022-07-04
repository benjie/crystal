select __person_secret_result__.*
from (
  select
    ids.ordinality - 1 as idx,
    (ids.value->>0)::"int4" as "id0"
  from json_array_elements($1::json) with ordinality as ids
) as __person_secret_identifiers__,
lateral (
  select
    __person_secret__."person_id"::text as "0",
    __person_secret__."sekrit" as "1",
    __person_secret_identifiers__.idx as "2"
  from "c"."person_secret" as __person_secret__
  where (
    __person_secret__."person_id" = __person_secret_identifiers__."id0"
  )
  order by __person_secret__."person_id" asc
) as __person_secret_result__

select
  __person_secret__."person_id"::text as "0",
  __person_secret__."sekrit" as "1"
from "c"."person_secret" as __person_secret__
order by __person_secret__."person_id" asc

select __person_result__.*
from (
  select
    ids.ordinality - 1 as idx,
    (ids.value->>0)::"int4" as "id0"
  from json_array_elements($1::json) with ordinality as ids
) as __person_identifiers__,
lateral (
  select
    __person_secret__."person_id"::text as "0",
    __person_secret__."sekrit" as "1",
    __person__."id"::text as "2",
    __person_identifiers__.idx as "3"
  from "c"."person" as __person__
  left outer join "c"."person_secret" as __person_secret__
  on (__person__."id"::"int4" = __person_secret__."person_id")
  where (
    __person__."id" = __person_identifiers__."id0"
  )
  order by __person__."id" asc
) as __person_result__

select __left_arm_result__.*
from (
  select
    ids.ordinality - 1 as idx,
    (ids.value->>0)::"int4" as "id0"
  from json_array_elements($1::json) with ordinality as ids
) as __left_arm_identifiers__,
lateral (
  select
    __left_arm__."id"::text as "0",
    __left_arm__."person_id"::text as "1",
    __left_arm__."length_in_metres"::text as "2",
    __left_arm__."mood" as "3",
    __left_arm_identifiers__.idx as "4"
  from "c"."left_arm" as __left_arm__
  where (
    __left_arm__."id" = __left_arm_identifiers__."id0"
  )
  order by __left_arm__."id" asc
) as __left_arm_result__

select
  __left_arm__."id"::text as "0",
  __left_arm__."person_id"::text as "1",
  __left_arm__."length_in_metres"::text as "2",
  __left_arm__."mood" as "3"
from "c"."left_arm" as __left_arm__
order by __left_arm__."id" asc

select __person_result__.*
from (
  select
    ids.ordinality - 1 as idx,
    (ids.value->>0)::"int4" as "id0"
  from json_array_elements($1::json) with ordinality as ids
) as __person_identifiers__,
lateral (
  select
    __left_arm__."id"::text as "0",
    __left_arm__."person_id"::text as "1",
    __left_arm__."length_in_metres"::text as "2",
    __left_arm__."mood" as "3",
    __person__."id"::text as "4",
    __person_identifiers__.idx as "5"
  from "c"."person" as __person__
  left outer join "c"."left_arm" as __left_arm__
  on (__person__."id"::"int4" = __left_arm__."person_id")
  where (
    __person__."id" = __person_identifiers__."id0"
  )
  order by __person__."id" asc
) as __person_result__

select __post_result__.*
from (
  select
    ids.ordinality - 1 as idx,
    (ids.value->>0)::"int4" as "id0"
  from json_array_elements($1::json) with ordinality as ids
) as __post_identifiers__,
lateral (
  select
    __post__."id"::text as "0",
    __post__."headline" as "1",
    __post__."body" as "2",
    __post__."author_id"::text as "3",
    __post_identifiers__.idx as "4"
  from "a"."post" as __post__
  where (
    __post__."id" = __post_identifiers__."id0"
  )
  order by __post__."id" asc
) as __post_result__

select
  __post__."id"::text as "0",
  __post__."headline" as "1",
  __post__."body" as "2",
  __post__."author_id"::text as "3"
from "a"."post" as __post__
order by __post__."id" asc

select __person_result__.*
from (
  select
    ids.ordinality - 1 as idx,
    (ids.value->>0)::"int4" as "id0"
  from json_array_elements($1::json) with ordinality as ids
) as __person_identifiers__,
lateral (
  select
    (select json_agg(_) from (
      select
        __post__."id"::text as "0",
        __post__."headline" as "1",
        __post__."body" as "2",
        __post__."author_id"::text as "3"
      from "a"."post" as __post__
      where (
        __person__."id"::"int4" = __post__."author_id"
      )
      order by __post__."id" asc
    ) _) as "0",
    __person__."id"::text as "1",
    __person_identifiers__.idx as "2"
  from "c"."person" as __person__
  where (
    __person__."id" = __person_identifiers__."id0"
  )
  order by __person__."id" asc
) as __person_result__

select
  __return_table_without_grants__."person_id_1"::text as "0",
  __return_table_without_grants__."person_id_2"::text as "1"
from "c"."return_table_without_grants"() as __return_table_without_grants__