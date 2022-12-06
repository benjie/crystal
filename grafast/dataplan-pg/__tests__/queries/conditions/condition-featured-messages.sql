select __forums_result__.*
from (
  select
    ids.ordinality - 1 as idx,
    (ids.value->>0)::"bool" as "id0"
  from json_array_elements($1::json) with ordinality as ids
) as __forums_identifiers__,
lateral (
  select
    __forums__."name" as "0",
    (select json_agg(_) from (
      select
        (count(*))::text as "0"
      from app_public.messages as __messages__
      where
        (
          __messages__.featured = __forums_identifiers__."id0"
        ) and (
          (__messages__.archived_at is null) = (__forums__."archived_at" is null)
        ) and (
          __forums__."id"::"uuid" = __messages__."forum_id"
        )
    ) _) as "1",
    (select json_agg(_) from (
      select
        __messages__."body" as "0",
        __users__."username" as "1",
        __users__."gravatar_url" as "2",
        __messages__."id" as "3",
        __users_2."username" as "4",
        __users_2."gravatar_url" as "5"
      from app_public.messages as __messages__
      left outer join app_public.users as __users__
      on (__messages__."author_id"::"uuid" = __users__."id")
      left outer join app_public.users as __users_2
      on (__messages__."author_id"::"uuid" = __users_2."id")
      where
        (
          __messages__.featured = __forums_identifiers__."id0"
        ) and (
          (__messages__.archived_at is null) = (__forums__."archived_at" is null)
        ) and (
          __forums__."id"::"uuid" = __messages__."forum_id"
        )
      order by __messages__."id" asc
      limit 6
    ) _) as "2",
    __forums_identifiers__.idx as "3"
  from app_public.forums as __forums__
  where
    (
      __forums__.archived_at is null
    ) and (
      true /* authorization checks */
    )
  order by __forums__."id" asc
) as __forums_result__;
