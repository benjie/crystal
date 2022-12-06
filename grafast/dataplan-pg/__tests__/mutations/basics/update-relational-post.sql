update interfaces_and_unions.relational_posts as __relational_posts__ set "description" = $1::"text" where (__relational_posts__."id" = $2::"int4") returning
  __relational_posts__."id"::text as "0";

select __relational_posts_result__.*
from (
  select
    ids.ordinality - 1 as idx,
    (ids.value->>0)::"int4" as "id0"
  from json_array_elements($1::json) with ordinality as ids
) as __relational_posts_identifiers__,
lateral (
  select
    __relational_posts__."title" as "0",
    __relational_posts__."description" as "1",
    __relational_posts__."note" as "2",
    __relational_posts_title_lower__.v as "3",
    __relational_items__."is_explicitly_archived"::text as "4",
    __people__."person_id"::text as "5",
    __people__."username" as "6",
    __relational_posts__."id"::text as "7",
    __relational_posts_identifiers__.idx as "8"
  from interfaces_and_unions.relational_posts as __relational_posts__
  left outer join interfaces_and_unions.relational_posts_title_lower(__relational_posts__) as __relational_posts_title_lower__(v)
  on TRUE
  left outer join interfaces_and_unions.relational_items as __relational_items__
  on (__relational_posts__."id"::"int4" = __relational_items__."id")
  left outer join interfaces_and_unions.people as __people__
  on (__relational_items__."author_id"::"int4" = __people__."person_id")
  where
    (
      true /* authorization checks */
    ) and (
      __relational_posts__."id" = __relational_posts_identifiers__."id0"
    )
  order by __relational_posts__."id" asc
) as __relational_posts_result__;

update interfaces_and_unions.relational_posts as __relational_posts__ set "note" = $1::"text" where (__relational_posts__."id" = $2::"int4") returning
  __relational_posts__."id"::text as "0";

select __relational_posts_result__.*
from (
  select
    ids.ordinality - 1 as idx,
    (ids.value->>0)::"int4" as "id0"
  from json_array_elements($1::json) with ordinality as ids
) as __relational_posts_identifiers__,
lateral (
  select
    __relational_posts__."title" as "0",
    __relational_posts__."description" as "1",
    __relational_posts__."note" as "2",
    __relational_posts_title_lower__.v as "3",
    __relational_items__."is_explicitly_archived"::text as "4",
    __people__."person_id"::text as "5",
    __people__."username" as "6",
    __relational_posts__."id"::text as "7",
    __relational_posts_identifiers__.idx as "8"
  from interfaces_and_unions.relational_posts as __relational_posts__
  left outer join interfaces_and_unions.relational_posts_title_lower(__relational_posts__) as __relational_posts_title_lower__(v)
  on TRUE
  left outer join interfaces_and_unions.relational_items as __relational_items__
  on (__relational_posts__."id"::"int4" = __relational_items__."id")
  left outer join interfaces_and_unions.people as __people__
  on (__relational_items__."author_id"::"int4" = __people__."person_id")
  where
    (
      true /* authorization checks */
    ) and (
      __relational_posts__."id" = __relational_posts_identifiers__."id0"
    )
  order by __relational_posts__."id" asc
) as __relational_posts_result__;

update interfaces_and_unions.relational_posts as __relational_posts__ set "description" = $1::"text" where (__relational_posts__."id" = $2::"int4") returning
  __relational_posts__."id"::text as "0";

select __relational_posts_result__.*
from (
  select
    ids.ordinality - 1 as idx,
    (ids.value->>0)::"int4" as "id0"
  from json_array_elements($1::json) with ordinality as ids
) as __relational_posts_identifiers__,
lateral (
  select
    __people__."username" as "0",
    __people__."person_id"::text as "1",
    __relational_items__."is_explicitly_archived"::text as "2",
    __relational_posts__."id"::text as "3",
    __relational_posts_title_lower__.v as "4",
    __relational_posts__."title" as "5",
    __relational_posts__."description" as "6",
    __relational_posts__."note" as "7",
    __relational_posts_identifiers__.idx as "8"
  from interfaces_and_unions.relational_posts as __relational_posts__
  left outer join interfaces_and_unions.relational_items as __relational_items__
  on (__relational_posts__."id"::"int4" = __relational_items__."id")
  left outer join interfaces_and_unions.people as __people__
  on (__relational_items__."author_id"::"int4" = __people__."person_id")
  left outer join interfaces_and_unions.relational_posts_title_lower(__relational_posts__) as __relational_posts_title_lower__(v)
  on TRUE
  where
    (
      true /* authorization checks */
    ) and (
      __relational_posts__."id" = __relational_posts_identifiers__."id0"
    )
  order by __relational_posts__."id" asc
) as __relational_posts_result__;

update interfaces_and_unions.relational_posts as __relational_posts__ set "description" = $1::"text" where (__relational_posts__."id" = $2::"int4") returning
  __relational_posts__."id"::text as "0";
