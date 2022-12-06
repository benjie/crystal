select
  __forums__."name" as "0",
  (select json_agg(_) from (
    select
      __messages__."body" as "0",
      __users__."username" as "1",
      __users__."gravatar_url" as "2"
    from app_public.messages as __messages__
    left outer join app_public.users as __users__
    on (__messages__."author_id"::"uuid" = __users__."id")
    where
      (
        (__messages__.archived_at is null) = (__forums__."archived_at" is null)
      ) and (
        __forums__."id"::"uuid" = __messages__."forum_id"
      )
    order by __messages__."id" asc
    limit 2
  ) _) as "1"
from app_public.forums as __forums__
where (
  true /* authorization checks */
)
order by __forums__."id" asc;
