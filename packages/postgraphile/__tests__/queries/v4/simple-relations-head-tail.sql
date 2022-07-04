select
  __compound_key__."person_id_1"::text as "0",
  __compound_key__."person_id_2"::text as "1"
from "c"."compound_key" as __compound_key__
order by __compound_key__."person_id_1" asc, __compound_key__."person_id_2" asc

select __person_result__.*
from (
  select
    ids.ordinality - 1 as idx,
    (ids.value->>0)::"text" as "id0"
  from json_array_elements($1::json) with ordinality as ids
) as __person_identifiers__,
lateral (
  select
    (select json_agg(_) from (
      select
        __post__."headline" as "0",
        __post__."author_id"::text as "1"
      from "a"."post" as __post__
      where (
        __person__."id"::"int4" = __post__."author_id"
      )
      order by __post__."id" asc
      limit 2
    ) _) as "0",
    (select json_agg(_) from (
      select
        __post_2."headline" as "0",
        __post_2."author_id"::text as "1"
      from "a"."post" as __post_2
      where
        (
          __post_2."headline" = __person_identifiers__."id0"
        ) and (
          __person__."id"::"int4" = __post_2."author_id"
        )
      order by __post_2."id" asc
    ) _) as "1",
    (select json_agg(_) from (
      select
        __compound_key__."person_id_1"::text as "0",
        __compound_key__."person_id_2"::text as "1"
      from "c"."compound_key" as __compound_key__
      where (
        __person__."id"::"int4" = __compound_key__."person_id_1"
      )
      order by __compound_key__."person_id_1" asc, __compound_key__."person_id_2" asc
    ) _) as "2",
    (select json_agg(_) from (
      select
        __compound_key_2."person_id_1"::text as "0",
        __compound_key_2."person_id_2"::text as "1"
      from "c"."compound_key" as __compound_key_2
      where (
        __person__."id"::"int4" = __compound_key_2."person_id_2"
      )
      order by __compound_key_2."person_id_1" asc, __compound_key_2."person_id_2" asc
    ) _) as "3",
    __person__."id"::text as "4",
    __person__."person_full_name" as "5",
    __person_identifiers__.idx as "6"
  from "c"."person" as __person__
  order by __person__."id" asc
) as __person_result__