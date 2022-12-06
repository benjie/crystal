select __forums_result__.*
from (
  select
    ids.ordinality - 1 as idx,
    (ids.value->>0)::"uuid" as "id0"
  from json_array_elements($1::json) with ordinality as ids
) as __forums_identifiers__,
lateral (
  select
    __forums_random_user__."username" as "0",
    __forums_random_user__."gravatar_url" as "1",
    __forums__."id" as "2",
    __forums_identifiers__.idx as "3"
  from app_public.forums as __forums__
  left outer join app_public.forums_random_user(__forums__) as __forums_random_user__
  on TRUE
  where
    (
      true /* authorization checks */
    ) and (
      __forums__."id" = __forums_identifiers__."id0"
    )
  order by __forums__."id" asc
) as __forums_result__;
