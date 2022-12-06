select __entity_search_result__.*
from (
  select
    ids.ordinality - 1 as idx,
    (ids.value->>0)::"text" as "id0"
  from json_array_elements($1::json) with ordinality as ids
) as __entity_search_identifiers__,
lateral (
  select
    (not (__entity_search__ is null))::text as "0",
    __entity_search__."person_id"::text as "1",
    __entity_search__."post_id"::text as "2",
    __entity_search__."comment_id"::text as "3",
    __entity_search_identifiers__.idx as "4"
  from interfaces_and_unions.search("query" := __entity_search_identifiers__."id0") as __entity_search__
  where (
    true /* authorization checks */
  )
) as __entity_search_result__;

select __people_result__.*
from (
  select
    ids.ordinality - 1 as idx,
    (ids.value->>0)::"int4" as "id0"
  from json_array_elements($1::json) with ordinality as ids
) as __people_identifiers__,
lateral (
  select
    __people__."person_id"::text as "0",
    __people__."username" as "1",
    __people_identifiers__.idx as "2"
  from interfaces_and_unions.people as __people__
  where
    (
      true /* authorization checks */
    ) and (
      __people__."person_id" = __people_identifiers__."id0"
    )
  order by __people__."person_id" asc
) as __people_result__;

select __posts_result__.*
from (
  select
    ids.ordinality - 1 as idx,
    (ids.value->>0)::"int4" as "id0"
  from json_array_elements($1::json) with ordinality as ids
) as __posts_identifiers__,
lateral (
  select
    __posts__."post_id"::text as "0",
    __people__."username" as "1",
    __posts__."body" as "2",
    __posts_identifiers__.idx as "3"
  from interfaces_and_unions.posts as __posts__
  left outer join interfaces_and_unions.people as __people__
  on (__posts__."author_id"::"int4" = __people__."person_id")
  where
    (
      true /* authorization checks */
    ) and (
      __posts__."post_id" = __posts_identifiers__."id0"
    )
  order by __posts__."post_id" asc
) as __posts_result__;

select __comments_result__.*
from (
  select
    ids.ordinality - 1 as idx,
    (ids.value->>0)::"int4" as "id0"
  from json_array_elements($1::json) with ordinality as ids
) as __comments_identifiers__,
lateral (
  select
    __comments__."body" as "0",
    __posts__."body" as "1",
    __posts__."post_id"::text as "2",
    __comments__."comment_id"::text as "3",
    __people__."username" as "4",
    __comments_identifiers__.idx as "5"
  from interfaces_and_unions.comments as __comments__
  left outer join interfaces_and_unions.posts as __posts__
  on (__comments__."post_id"::"int4" = __posts__."post_id")
  left outer join interfaces_and_unions.people as __people__
  on (__comments__."author_id"::"int4" = __people__."person_id")
  where
    (
      true /* authorization checks */
    ) and (
      __comments__."comment_id" = __comments_identifiers__."id0"
    )
  order by __comments__."comment_id" asc
) as __comments_result__;
