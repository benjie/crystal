/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

/*
 * This is a hand-rolled GraphQL schema that we used throughout the development
 * of DataPlanner; it's used for the @dataplan/pg tests and demonstrates common
 * patterns as well as edge cases. This is NOT meant to be an example of how
 * _you_ should write a schema, in particular it's (deliberately) quite
 * inconsistent and has many ways of achieving the same goals. I would not
 * recommend reading it in full, but dipping in to particular places you're
 * interested in might be useful.
 */

import { jsonParse, JSONParsePlan } from "@dataplan/json";
import * as crypto from "crypto";
import type {
  __InputObjectPlan,
  __InputStaticLeafPlan,
  __TrackedObjectPlan,
  AccessPlan,
  BaseGraphQLContext,
  BaseGraphQLRootValue,
  CrystalSubscriber,
  ExecutablePlan,
  ListPlan,
} from "dataplanner";
import {
  __ListTransformPlan,
  __ValuePlan,
  aether,
  connection,
  ConnectionPlan,
  constant,
  context,
  dataplannerEnforce,
  each,
  filter,
  getEnumValueConfig,
  groupBy,
  lambda,
  list,
  listen,
  newGraphileFieldConfigBuilder,
  newInputObjectTypeBuilder,
  newObjectTypeBuilder,
  object,
  resolveType,
} from "dataplanner";
import { writeFileSync } from "fs";
import { EXPORTABLE } from "graphile-export";
import type { GraphQLOutputType } from "graphql";
import {
  GraphQLBoolean,
  GraphQLEnumType,
  GraphQLInt,
  GraphQLInterfaceType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  GraphQLUnionType,
  printSchema,
} from "graphql";
import type { SQL } from "pg-sql2";
import sql from "pg-sql2";
//import prettier from "prettier";
import { inspect } from "util";

import type {
  PgConditionPlan,
  PgExecutorContextPlans,
  PgInsertPlan,
  PgSelectPlan,
  PgSubscriber,
  PgTypeCodec,
  PgTypeColumn,
  PgTypeColumnVia,
  WithPgClient,
} from "../";
import {
  BooleanFilterPlan,
  ClassFilterPlan,
  enumType,
  ManyFilterPlan,
  pgClassExpression,
  PgClassExpressionPlan,
  pgDelete,
  PgDeletePlan,
  PgEnumSource,
  PgExecutor,
  pgInsert,
  pgPolymorphic,
  pgSelect,
  pgSelectSingleFromRecord,
  PgSelectSinglePlan,
  pgSingleTablePolymorphic,
  PgSource,
  PgSourceBuilder,
  pgUpdate,
  PgUpdatePlan,
  recordType,
  TYPES,
} from "../";
import type { PgTypeColumns } from "../codecs.js";
import { listOfType } from "../codecs.js";
import { PgPageInfoPlan } from "../plans/pgPageInfo.js";
import type { PgPolymorphicTypeMap } from "../plans/pgPolymorphic.js";

declare module ".." {
  interface PgEnumSourceExtensions {
    tableSource?: PgSource<any, any, any, any>;
  }
}

// These are what the generics extend from

// This is the actual runtime context; we should not use a global for this.
export interface OurGraphQLContext extends BaseGraphQLContext {
  pgSettings: { [key: string]: string };
  withPgClient: WithPgClient;
  pgSubscriber: PgSubscriber;
}

/*+--------------------------------------------------------------------------+
  |                               DATA SOURCES                               |
  +--------------------------------------------------------------------------+*/

/**
 * Expand this interface with your own types.
 */
export interface GraphQLTypeFromPostgresType {
  text: string;
  citext: string;
  uuid: string;
  timestamptz: string;
  int: number;
  float: number;
  boolean: boolean;
}

type NullableUnless<
  TCondition extends boolean | undefined,
  TType,
> = TCondition extends true ? TType : TType | null | undefined;

export function makeExampleSchema(
  options: { deoptimize?: boolean } = Object.create(null),
): GraphQLSchema {
  const deoptimizeIfAppropriate = EXPORTABLE(
    (__ListTransformPlan, options) =>
      <
        TPlan extends
          | PgSelectPlan<any, any, any, any>
          | PgSelectSinglePlan<any, any, any, any>
          | PgClassExpressionPlan<any, any, any, any, any, any>
          | __ListTransformPlan<
              PgSelectPlan<any, any, any, any>,
              any,
              any,
              any
            >,
      >(
        plan: TPlan,
      ): TPlan => {
        if (options.deoptimize) {
          const innerPlan =
            plan instanceof __ListTransformPlan
              ? plan.getListPlan()
              : (plan as
                  | PgSelectPlan<any, any, any, any>
                  | PgSelectSinglePlan<any, any, any, any>);
          if ("getClassPlan" in innerPlan) {
            innerPlan.getClassPlan().setInliningForbidden();
          } else if ("setInliningForbidden" in innerPlan) {
            innerPlan.setInliningForbidden();
          }
        }
        return plan;
      },
    [__ListTransformPlan, options],
  );
  type PgSelectPlanFromSource<TSource extends PgSource<any, any, any, any>> =
    PgSelectPlan<
      TSource["TColumns"],
      TSource["TUniques"],
      TSource["TRelations"],
      TSource["TParameters"]
    >;
  type PgSelectSinglePlanFromSource<
    TSource extends PgSource<any, any, any, any>,
  > = PgSelectSinglePlan<
    TSource["TColumns"],
    TSource["TUniques"],
    TSource["TRelations"],
    TSource["TParameters"]
  >;
  type PgConnectionPlanFromSource<
    TSource extends PgSource<any, any, any, any>,
  > = ConnectionPlan<
    PgSelectSinglePlan<
      TSource["TColumns"],
      TSource["TUniques"],
      TSource["TRelations"],
      TSource["TParameters"]
    >,
    PgSelectPlan<
      TSource["TColumns"],
      TSource["TUniques"],
      TSource["TRelations"],
      TSource["TParameters"]
    >,
    PgSelectSinglePlan<
      TSource["TColumns"],
      TSource["TUniques"],
      TSource["TRelations"],
      TSource["TParameters"]
    >
  >;
  type PgInsertPlanFromSource<TSource extends PgSource<any, any, any, any>> =
    PgInsertPlan<
      TSource["TColumns"],
      TSource["TUniques"],
      TSource["TRelations"]
    >;
  type PgUpdatePlanFromSource<TSource extends PgSource<any, any, any, any>> =
    PgUpdatePlan<
      TSource["TColumns"],
      TSource["TUniques"],
      TSource["TRelations"]
    >;
  type PgDeletePlanFromSource<TSource extends PgSource<any, any, any, any>> =
    PgDeletePlan<
      TSource["TColumns"],
      TSource["TUniques"],
      TSource["TRelations"]
    >;

  // type MessagesPlan = PgSelectPlanFromSource<typeof messageSource>;
  type MessageConnectionPlan = PgConnectionPlanFromSource<typeof messageSource>;
  type MessagePlan = PgSelectSinglePlanFromSource<typeof messageSource>;
  // type UsersPlan = PgSelectPlanFromSource<typeof userSource>;
  type UserPlan = PgSelectSinglePlanFromSource<typeof userSource>;
  // type ForumsPlan = PgSelectPlanFromSource<typeof forumSource>;
  type ForumPlan = PgSelectSinglePlanFromSource<typeof forumSource>;
  type PersonPlan = PgSelectSinglePlanFromSource<typeof personSource>;
  type PersonBookmarkPlan = PgSelectSinglePlanFromSource<
    typeof personBookmarksSource
  >;
  type PostPlan = PgSelectSinglePlanFromSource<typeof postSource>;
  type CommentPlan = PgSelectSinglePlanFromSource<typeof commentSource>;
  type SingleTableItemsPlan = PgSelectPlanFromSource<
    typeof singleTableItemsSource
  >;
  type SingleTableItemPlan = PgSelectSinglePlanFromSource<
    typeof singleTableItemsSource
  >;
  type RelationalItemsPlan = PgSelectPlanFromSource<
    typeof relationalItemsSource
  >;
  type RelationalItemPlan = PgSelectSinglePlanFromSource<
    typeof relationalItemsSource
  >;
  type RelationalTopicPlan = PgSelectSinglePlanFromSource<
    typeof relationalTopicsSource
  >;
  type RelationalPostPlan = PgSelectSinglePlanFromSource<
    typeof relationalPostsSource
  >;
  type RelationalDividerPlan = PgSelectSinglePlanFromSource<
    typeof relationalDividersSource
  >;
  type RelationalChecklistPlan = PgSelectSinglePlanFromSource<
    typeof relationalChecklistsSource
  >;
  type RelationalChecklistItemPlan = PgSelectSinglePlanFromSource<
    typeof relationalChecklistItemsSource
  >;
  type UnionItemsPlan = PgSelectPlanFromSource<typeof unionItemsSource>;
  type UnionItemPlan = PgSelectSinglePlanFromSource<typeof unionItemsSource>;
  type UnionTopicPlan = PgSelectSinglePlanFromSource<typeof unionTopicsSource>;
  type UnionPostPlan = PgSelectSinglePlanFromSource<typeof unionPostsSource>;
  type UnionDividerPlan = PgSelectSinglePlanFromSource<
    typeof unionDividersSource
  >;
  type UnionChecklistPlan = PgSelectSinglePlanFromSource<
    typeof unionChecklistsSource
  >;
  type UnionChecklistItemPlan = PgSelectSinglePlanFromSource<
    typeof unionChecklistItemsSource
  >;
  type RelationalCommentablesPlan = PgSelectPlanFromSource<
    typeof relationalCommentableSource
  >;
  type RelationalCommentablePlan = PgSelectSinglePlanFromSource<
    typeof relationalCommentableSource
  >;

  const col = <
    TOptions extends {
      codec: PgTypeCodec<any, any, any>;
      notNull?: boolean;
      expression?: PgTypeColumn<any>["expression"];
      // TODO: we could make TypeScript understand the relations on the object
      // rather than just being string.
      via?: PgTypeColumnVia;
      identicalVia?: PgTypeColumnVia;
    },
  >(
    options: TOptions,
  ): PgTypeColumn<
    NullableUnless<TOptions["notNull"], ReturnType<TOptions["codec"]["fromPg"]>>
  > => {
    const { notNull, codec, expression, via, identicalVia } = options;
    return {
      codec,
      notNull: !!notNull,
      expression,
      via,
      identicalVia,
    };
  };

  const userColumns = EXPORTABLE(
    (TYPES, col) => ({
      id: col({ notNull: true, codec: TYPES.uuid }),
      username: col({ notNull: true, codec: TYPES.citext }),
      gravatar_url: col({ codec: TYPES.text }),
      created_at: col({ notNull: true, codec: TYPES.timestamptz }),
    }),
    [TYPES, col],
  );

  const forumColumns = EXPORTABLE(
    (TYPES, col, sql) => ({
      id: col({ notNull: true, codec: TYPES.uuid }),
      name: col({ notNull: true, codec: TYPES.citext }),
      archived_at: col({ codec: TYPES.timestamptz }),
      is_archived: col({
        codec: TYPES.boolean,
        expression: (alias) => sql`${alias}.archived_at is not null`,
      }),
    }),
    [TYPES, col, sql],
  );
  const forumCodec = EXPORTABLE(
    (forumColumns, recordType, sql) =>
      recordType("forums", sql`app_public.forums`, forumColumns),
    [forumColumns, recordType, sql],
  );

  const messageColumns = EXPORTABLE(
    (TYPES, col, sql) => ({
      id: col({ notNull: true, codec: TYPES.uuid }),
      body: col({ notNull: true, codec: TYPES.text }),
      author_id: col({
        notNull: true,
        codec: TYPES.uuid,
        identicalVia: { relation: "author", attribute: "person_id" },
      }),
      forum_id: col({
        notNull: true,
        codec: TYPES.uuid,
        identicalVia: { relation: "forum", attribute: "id" },
      }),
      created_at: col({ notNull: true, codec: TYPES.timestamptz }),
      archived_at: col({ codec: TYPES.timestamptz }),
      featured: col({ codec: TYPES.boolean }),
      is_archived: col({
        codec: TYPES.boolean,
        expression: (alias) => sql`${alias}.archived_at is not null`,
      }),
    }),
    [TYPES, col, sql],
  );

  const executor = EXPORTABLE(
    (PgExecutor, context, object) =>
      new PgExecutor({
        name: "default",
        context: () => {
          const $context = context<OurGraphQLContext>();
          return object<
            PgExecutorContextPlans<OurGraphQLContext["pgSettings"]>
          >({
            pgSettings: $context.get("pgSettings"),
            withPgClient: $context.get("withPgClient"),
          });
        },
      }),
    [PgExecutor, context, object],
  );

  /**
   * Applies auth checks to the plan; we are using a placeholder here for now.
   */
  const selectAuth = EXPORTABLE(
    (sql) => ($plan: PgSelectPlan<any, any, any, any>) => {
      $plan.where(sql`true /* authorization checks */`);
    },
    [sql],
  );

  const uniqueAuthorCountSource = EXPORTABLE(
    (PgSource, TYPES, executor, selectAuth, sql) =>
      new PgSource({
        executor,
        selectAuth,
        codec: TYPES.int,
        source: (...args) =>
          sql`app_public.unique_author_count(${sql.join(args, ", ")})`,
        name: "unique_author_count",
        parameters: [
          {
            name: "featured",
            required: false,
            codec: TYPES.boolean,
          },
        ],
        isUnique: true,
      }),
    [PgSource, TYPES, executor, selectAuth, sql],
  );

  const forumNamesArraySource = EXPORTABLE(
    (PgSource, TYPES, executor, listOfType, selectAuth, sql) =>
      new PgSource({
        executor,
        selectAuth,
        codec: listOfType(TYPES.text),
        source: (...args) =>
          sql`app_public.forum_names_array(${sql.join(args, ", ")})`,
        name: "forum_names_array",
        parameters: [],
        isUnique: true, // No setof
      }),
    [PgSource, TYPES, executor, listOfType, selectAuth, sql],
  );

  const forumNamesCasesSource = EXPORTABLE(
    (PgSource, TYPES, executor, listOfType, selectAuth, sql) =>
      new PgSource({
        executor,
        selectAuth,
        codec: listOfType(TYPES.text),
        source: (...args) =>
          sql`app_public.forum_names_cases(${sql.join(args, ", ")})`,
        name: "forum_names_cases",
        parameters: [],
      }),
    [PgSource, TYPES, executor, listOfType, selectAuth, sql],
  );

  const forumsUniqueAuthorCountSource = EXPORTABLE(
    (PgSource, TYPES, executor, forumCodec, selectAuth, sql) =>
      new PgSource({
        executor,
        selectAuth,
        codec: TYPES.int,
        source: (...args) =>
          sql`app_public.forums_unique_author_count(${sql.join(args, ", ")})`,
        name: "forums_unique_author_count",
        parameters: [
          {
            name: "forums",
            required: true,
            codec: forumCodec,
          },
          {
            name: "featured",
            required: false,
            codec: TYPES.boolean,
          },
        ],
        isUnique: true,
      }),
    [PgSource, TYPES, executor, forumCodec, selectAuth, sql],
  );

  const scalarTextSource = EXPORTABLE(
    (PgSource, TYPES, executor, selectAuth, sql) =>
      new PgSource({
        executor,
        selectAuth,
        codec: TYPES.text,
        source: sql`(select '')`,
        name: "text",
      }),
    [PgSource, TYPES, executor, selectAuth, sql],
  );

  const messageSourceBuilder = EXPORTABLE(
    (PgSourceBuilder, executor, messageColumns, recordType, selectAuth, sql) =>
      new PgSourceBuilder({
        executor,
        selectAuth,
        codec: recordType("messages", sql`app_public.messages`, messageColumns),
        source: sql`app_public.messages`,
        name: "messages",
        uniques: [{ columns: ["id"], isPrimary: true }],
      }),
    [PgSourceBuilder, executor, messageColumns, recordType, selectAuth, sql],
  );

  const userSource = EXPORTABLE(
    (PgSource, executor, recordType, selectAuth, sql, userColumns) =>
      new PgSource({
        executor,
        selectAuth,
        codec: recordType("users", sql`app_public.users`, userColumns),
        source: sql`app_public.users`,
        name: "users",
        uniques: [
          { columns: ["id"], isPrimary: true },
          { columns: ["username"] },
        ],
      }),
    [PgSource, executor, recordType, selectAuth, sql, userColumns],
  );

  const forumSource = EXPORTABLE(
    (PgSource, executor, forumCodec, selectAuth, sql) =>
      new PgSource({
        executor,
        selectAuth,
        codec: forumCodec,
        source: sql`app_public.forums`,
        name: "forums",
        uniques: [{ columns: ["id"], isPrimary: true }],
      }),
    [PgSource, executor, forumCodec, selectAuth, sql],
  );

  const usersMostRecentForumSource = EXPORTABLE(
    (forumSource, sql, userSource) =>
      forumSource.functionSource({
        name: "users_most_recent_forum",
        source: (...args) =>
          sql`app_public.users_most_recent_forum(${sql.join(args, ", ")})`,
        returnsArray: false,
        returnsSetof: false,
        parameters: [
          {
            name: "u",
            codec: userSource.codec,
            required: true,
            notNull: true,
          },
        ],
      }),
    [forumSource, sql, userSource],
  );

  const messageSource = EXPORTABLE(
    (forumSource, messageSourceBuilder, userSource) =>
      messageSourceBuilder.build({
        relations: {
          author: {
            source: userSource,
            localColumns: [`author_id`],
            remoteColumns: [`id`],
            isUnique: true,
          },
          forum: {
            source: forumSource,
            localColumns: ["forum_id"],
            remoteColumns: ["id"],
            isUnique: true,
          },
        },
      }),
    [forumSource, messageSourceBuilder, userSource],
  );

  const featuredMessages = EXPORTABLE(
    (messageSource, sql) =>
      messageSource.functionSource({
        name: "featured_messages",
        source: (...args) =>
          sql`app_public.featured_messages(${sql.join(args, ", ")})`,
        returnsSetof: true,
        returnsArray: false,
        parameters: [],
      }),
    [messageSource, sql],
  );

  const forumsFeaturedMessages = EXPORTABLE(
    (forumCodec, messageSource, sql) =>
      messageSource.functionSource({
        name: "forums_featured_messages",
        source: (...args) =>
          sql`app_public.forums_featured_messages(${sql.join(args, ", ")})`,
        returnsSetof: true,
        returnsArray: false,
        parameters: [
          {
            name: "forum",
            required: true,
            codec: forumCodec,
          },
        ],
      }),
    [forumCodec, messageSource, sql],
  );

  const randomUserArraySource = EXPORTABLE(
    (sql, userSource) =>
      userSource.functionSource({
        name: "random_user_array",
        source: (...args) =>
          sql`app_public.random_user_array(${sql.join(args, ", ")})`,
        returnsArray: true,
        returnsSetof: false,
        parameters: [],
      }),
    [sql, userSource],
  );

  const randomUserArraySetSource = EXPORTABLE(
    (sql, userSource) =>
      userSource.functionSource({
        name: "random_user_array_set",
        source: (...args) =>
          sql`app_public.random_user_array_set(${sql.join(args, ", ")})`,
        returnsSetof: true,
        returnsArray: true,
        parameters: [],
      }),
    [sql, userSource],
  );

  const forumsMessagesListSetSource = EXPORTABLE(
    (messageSource, sql) =>
      messageSource.functionSource({
        name: "forums_messages_list_set",
        source: (...args) =>
          sql`app_public.forums_messages_list_set(${sql.join(args, ", ")})`,
        parameters: [],
        returnsArray: true,
        returnsSetof: true,
        extensions: {
          tags: {
            name: "messagesListSet",
          },
        },
      }),
    [messageSource, sql],
  );

  const unionEntityColumns = EXPORTABLE(
    (TYPES, col) => ({
      person_id: col({ codec: TYPES.int, notNull: false }),
      post_id: col({ codec: TYPES.int, notNull: false }),
      comment_id: col({ codec: TYPES.int, notNull: false }),
    }),
    [TYPES, col],
  );

  const personBookmarkColumns = EXPORTABLE(
    (TYPES, col, recordType, sql, unionEntityColumns) => ({
      id: col({ codec: TYPES.int, notNull: true }),
      person_id: col({
        codec: TYPES.int,
        notNull: true,
        identicalVia: { relation: "person", attribute: "id" },
      }),
      bookmarked_entity: col({
        codec: recordType(
          "union__entity",
          sql`interfaces_and_unions.union__entity`,
          unionEntityColumns,
        ),
        notNull: true,
      }),
    }),
    [TYPES, col, recordType, sql, unionEntityColumns],
  );
  const personBookmarksSourceBuilder = EXPORTABLE(
    (
      PgSourceBuilder,
      executor,
      personBookmarkColumns,
      recordType,
      selectAuth,
      sql,
    ) =>
      new PgSourceBuilder({
        executor,
        selectAuth,
        codec: recordType(
          "person_bookmarks",
          sql`interfaces_and_unions.person_bookmarks`,
          personBookmarkColumns,
        ),
        source: sql`interfaces_and_unions.person_bookmarks`,
        name: "person_bookmarks",
        uniques: [{ columns: ["id"], isPrimary: true }],
      }),
    [
      PgSourceBuilder,
      executor,
      personBookmarkColumns,
      recordType,
      selectAuth,
      sql,
    ],
  );

  const personColumns = EXPORTABLE(
    (TYPES, col) => ({
      person_id: col({ codec: TYPES.int, notNull: true }),
      username: col({ codec: TYPES.text, notNull: true }),
    }),
    [TYPES, col],
  );

  const personSourceBuilder = EXPORTABLE(
    (PgSourceBuilder, executor, personColumns, recordType, selectAuth, sql) =>
      new PgSourceBuilder({
        executor,
        selectAuth,
        codec: recordType(
          "interfaces_and_unions.people",
          sql`interfaces_and_unions.people`,
          personColumns,
        ),
        source: sql`interfaces_and_unions.people`,
        name: "people",
        uniques: [
          { columns: ["person_id"], isPrimary: true },
          { columns: ["username"] },
        ],
      }),
    [PgSourceBuilder, executor, personColumns, recordType, selectAuth, sql],
  );

  const postColumns = EXPORTABLE(
    (TYPES, col) => ({
      post_id: col({ codec: TYPES.int, notNull: true }),
      author_id: col({
        codec: TYPES.int,
        notNull: true,
        identicalVia: { relation: "author", attribute: "person_id" },
      }),
      body: col({ codec: TYPES.text, notNull: true }),
    }),
    [TYPES, col],
  );

  const postSourceBuilder = EXPORTABLE(
    (PgSourceBuilder, executor, postColumns, recordType, selectAuth, sql) =>
      new PgSourceBuilder({
        executor,
        selectAuth,
        codec: recordType(
          "interfaces_and_unions.posts",
          sql`interfaces_and_unions.posts`,
          postColumns,
        ),
        source: sql`interfaces_and_unions.posts`,
        name: "posts",
        uniques: [{ columns: ["post_id"], isPrimary: true }],
      }),
    [PgSourceBuilder, executor, postColumns, recordType, selectAuth, sql],
  );

  const commentColumns = EXPORTABLE(
    (TYPES, col) => ({
      comment_id: col({ codec: TYPES.int, notNull: true }),
      author_id: col({
        codec: TYPES.int,
        notNull: true,
        identicalVia: { relation: "author", attribute: "person_id" },
      }),
      post_id: col({
        codec: TYPES.int,
        notNull: true,
        identicalVia: { relation: "post", attribute: "id" },
      }),
      body: col({ codec: TYPES.text, notNull: true }),
    }),
    [TYPES, col],
  );

  const commentSourceBuilder = EXPORTABLE(
    (PgSourceBuilder, commentColumns, executor, recordType, selectAuth, sql) =>
      new PgSourceBuilder({
        executor,
        selectAuth,
        codec: recordType(
          "interfaces_and_unions.comments",
          sql`interfaces_and_unions.comments`,
          commentColumns,
        ),
        source: sql`interfaces_and_unions.comments`,
        name: "comments",
        uniques: [{ columns: ["comment_id"], isPrimary: true }],
      }),
    [PgSourceBuilder, commentColumns, executor, recordType, selectAuth, sql],
  );

  const itemTypeEnumSource = EXPORTABLE(
    (PgEnumSource, enumType, sql) =>
      new PgEnumSource({
        codec: enumType(
          `interfaces_and_unions.item_type`,
          sql`interfaces_and_unions.item_type`,
          ["TOPIC", "POST", "DIVIDER", "CHECKLIST", "CHECKLIST_ITEM"],
        ),
      }),
    [PgEnumSource, enumType, sql],
  );

  const enumTablesItemTypeColumns = EXPORTABLE(
    (TYPES) => ({
      type: {
        codec: TYPES.text,
        notNull: true,
      },
      description: {
        codec: TYPES.text,
        notNull: false,
      },
    }),
    [TYPES],
  );

  const enumTableItemTypeSourceBuilder = EXPORTABLE(
    (
      PgSourceBuilder,
      enumTablesItemTypeColumns,
      executor,
      recordType,
      selectAuth,
      sql,
    ) =>
      new PgSourceBuilder({
        executor,
        selectAuth,
        codec: recordType(
          `interfaces_and_unions.enum_table_item_type`,
          sql`interfaces_and_unions.enum_table_item_type`,
          enumTablesItemTypeColumns,
        ),
        source: sql`interfaces_and_unions.enum_table_item_type`,
        name: "enum_table_item_type",
        uniques: [{ columns: ["type"], isPrimary: true }],
      }),
    [
      PgSourceBuilder,
      enumTablesItemTypeColumns,
      executor,
      recordType,
      selectAuth,
      sql,
    ],
  );

  const enumTableItemTypeSource = EXPORTABLE(
    (enumTableItemTypeSourceBuilder) =>
      enumTableItemTypeSourceBuilder.build({}),
    [enumTableItemTypeSourceBuilder],
  );

  const enumTableItemTypeEnumSource = EXPORTABLE(
    (PgEnumSource, enumTableItemTypeSource, enumType, sql) =>
      new PgEnumSource({
        codec: enumType("text", sql`text`, [
          "TOPIC",
          "POST",
          "DIVIDER",
          "CHECKLIST",
          "CHECKLIST_ITEM",
        ]),
        extensions: {
          tableSource: enumTableItemTypeSource,
        },
      }),
    [PgEnumSource, enumTableItemTypeSource, enumType, sql],
  );

  const EnumTableItemType = new GraphQLEnumType({
    name: "EnumTableItemType",
    values: {
      TOPIC: { value: "TOPIC" },
      POST: { value: "POST" },
      DIVIDER: { value: "DIVIDER" },
      CHECKLIST: { value: "CHECKLIST" },
      CHECKLIST_ITEM: { value: "CHECKLIST_ITEM" },
    },
  });

  const singleTableItemColumns = EXPORTABLE(
    (TYPES, col, enumTableItemTypeEnumSource, itemTypeEnumSource) => ({
      id: col({ codec: TYPES.int, notNull: true }),
      type: col({
        codec: itemTypeEnumSource.codec,
        notNull: true,
      }),
      type2: col({
        codec: enumTableItemTypeEnumSource.codec,
        notNull: true,
      }),

      parent_id: col({
        codec: TYPES.int,
        notNull: false,
        identicalVia: { relation: "parent", attribute: "id" },
      }),
      author_id: col({
        codec: TYPES.int,
        notNull: true,
        identicalVia: { relation: "author", attribute: "person_id" },
      }),
      position: col({ codec: TYPES.bigint, notNull: true }),
      created_at: col({ codec: TYPES.timestamptz, notNull: true }),
      updated_at: col({ codec: TYPES.timestamptz, notNull: true }),
      is_explicitly_archived: col({ codec: TYPES.boolean, notNull: true }),
      archived_at: col({ codec: TYPES.timestamptz, notNull: false }),

      title: col({ codec: TYPES.text, notNull: false }),
      description: col({ codec: TYPES.text, notNull: false }),
      note: col({ codec: TYPES.text, notNull: false }),
      color: col({ codec: TYPES.text, notNull: false }),
    }),
    [TYPES, col, enumTableItemTypeEnumSource, itemTypeEnumSource],
  );
  const singleTableItemsSourceBuilder = EXPORTABLE(
    (
      PgSourceBuilder,
      executor,
      recordType,
      selectAuth,
      singleTableItemColumns,
      sql,
    ) =>
      new PgSourceBuilder({
        executor,
        selectAuth,
        codec: recordType(
          `interfaces_and_unions.single_table_items`,
          sql`interfaces_and_unions.single_table_items`,
          singleTableItemColumns,
        ),
        source: sql`interfaces_and_unions.single_table_items`,
        name: "single_table_items",
        uniques: [{ columns: ["id"], isPrimary: true }],
      }),
    [
      PgSourceBuilder,
      executor,
      recordType,
      selectAuth,
      singleTableItemColumns,
      sql,
    ],
  );

  const personBookmarksSource = EXPORTABLE(
    (personBookmarksSourceBuilder, personSourceBuilder) =>
      personBookmarksSourceBuilder.build({
        relations: {
          person: {
            source: personSourceBuilder,
            isUnique: true,
            localColumns: ["person_id"],
            remoteColumns: ["person_id"],
          },
        },
      }),
    [personBookmarksSourceBuilder, personSourceBuilder],
  );

  const personSource = EXPORTABLE(
    (
      personBookmarksSource,
      personSourceBuilder,
      postSourceBuilder,
      singleTableItemsSourceBuilder,
    ) =>
      personSourceBuilder.build({
        relations: {
          singleTableItems: {
            source: singleTableItemsSourceBuilder,
            isUnique: false,
            localColumns: ["person_id"],
            remoteColumns: ["author_id"],
          },
          posts: {
            source: postSourceBuilder,
            isUnique: false,
            localColumns: ["person_id"],
            remoteColumns: ["author_id"],
          },
          comments: {
            source: postSourceBuilder,
            isUnique: false,
            localColumns: ["person_id"],
            remoteColumns: ["author_id"],
          },
          personBookmarks: {
            source: personBookmarksSource,
            isUnique: false,
            localColumns: ["person_id"],
            remoteColumns: ["person_id"],
          },
        },
      }),
    [
      personBookmarksSource,
      personSourceBuilder,
      postSourceBuilder,
      singleTableItemsSourceBuilder,
    ],
  );

  const postSource = EXPORTABLE(
    (commentSourceBuilder, personSource, postSourceBuilder) =>
      postSourceBuilder.build({
        relations: {
          author: {
            source: personSource,
            isUnique: true,
            localColumns: ["author_id"],
            remoteColumns: ["person_id"],
          },
          comments: {
            source: commentSourceBuilder,
            isUnique: false,
            localColumns: ["post_id"],
            remoteColumns: ["post_id"],
          },
        },
      }),
    [commentSourceBuilder, personSource, postSourceBuilder],
  );

  const commentSource = EXPORTABLE(
    (commentSourceBuilder, personSource, postSource) =>
      commentSourceBuilder.build({
        relations: {
          author: {
            source: personSource,
            isUnique: true,
            localColumns: ["author_id"],
            remoteColumns: ["person_id"],
          },
          post: {
            source: postSource,
            isUnique: true,
            localColumns: ["post_id"],
            remoteColumns: ["post_id"],
          },
        },
      }),
    [commentSourceBuilder, personSource, postSource],
  );

  const singleTableItemsSource = EXPORTABLE(
    (personSource, singleTableItemsSourceBuilder) =>
      singleTableItemsSourceBuilder.build({
        relations: {
          parent: {
            source: singleTableItemsSourceBuilder,
            isUnique: true,
            localColumns: ["parent_id"],
            remoteColumns: ["id"],
          },
          children: {
            source: singleTableItemsSourceBuilder,
            isUnique: false,
            localColumns: ["id"],
            remoteColumns: ["parent_id"],
          },
          author: {
            source: personSource,
            isUnique: true,
            localColumns: ["author_id"],
            remoteColumns: ["person_id"],
          },
        },
      }),
    [personSource, singleTableItemsSourceBuilder],
  );

  const relationalItemColumns = EXPORTABLE(
    (TYPES, col, enumTableItemTypeEnumSource, itemTypeEnumSource) => ({
      id: col({ codec: TYPES.int, notNull: true }),
      type: col({
        codec: itemTypeEnumSource.codec,
        notNull: true,
      }),
      type2: col({
        codec: enumTableItemTypeEnumSource.codec,
        notNull: true,
      }),

      parent_id: col({
        codec: TYPES.int,
        notNull: false,
        identicalVia: { relation: "parent", attribute: "id" },
      }),
      author_id: col({
        codec: TYPES.int,
        notNull: true,
        identicalVia: { relation: "author", attribute: "person_id" },
      }),
      position: col({ codec: TYPES.bigint, notNull: true }),
      created_at: col({ codec: TYPES.timestamptz, notNull: true }),
      updated_at: col({ codec: TYPES.timestamptz, notNull: true }),
      is_explicitly_archived: col({ codec: TYPES.boolean, notNull: true }),
      archived_at: col({ codec: TYPES.timestamptz, notNull: false }),
    }),
    [TYPES, col, enumTableItemTypeEnumSource, itemTypeEnumSource],
  );

  const relationalItemsSourceBuilder = EXPORTABLE(
    (
      PgSourceBuilder,
      executor,
      recordType,
      relationalItemColumns,
      selectAuth,
      sql,
    ) =>
      new PgSourceBuilder({
        executor,
        selectAuth,
        codec: recordType(
          `interfaces_and_unions.relational_items`,
          sql`interfaces_and_unions.relational_items`,
          relationalItemColumns,
        ),
        source: sql`interfaces_and_unions.relational_items`,
        name: "relational_items",
        uniques: [{ columns: ["id"], isPrimary: true }],
      }),
    [
      PgSourceBuilder,
      executor,
      recordType,
      relationalItemColumns,
      selectAuth,
      sql,
    ],
  );

  const relationalCommentableColumns = EXPORTABLE(
    (TYPES, col, enumTableItemTypeEnumSource, itemTypeEnumSource) => ({
      id: col({ codec: TYPES.int, notNull: true }),
      type: col({
        codec: itemTypeEnumSource.codec,
        notNull: true,
      }),
      type2: col({
        codec: enumTableItemTypeEnumSource.codec,
        notNull: true,
      }),
    }),
    [TYPES, col, enumTableItemTypeEnumSource, itemTypeEnumSource],
  );

  const relationalCommentableSourceBuilder = EXPORTABLE(
    (
      PgSourceBuilder,
      executor,
      recordType,
      relationalCommentableColumns,
      selectAuth,
      sql,
    ) =>
      new PgSourceBuilder({
        executor,
        selectAuth,
        codec: recordType(
          `interfaces_and_unions.relational_commentables`,
          sql`interfaces_and_unions.relational_commentables`,
          relationalCommentableColumns,
        ),
        source: sql`interfaces_and_unions.relational_commentables`,
        name: "relational_commentables",
      }),
    [
      PgSourceBuilder,
      executor,
      recordType,
      relationalCommentableColumns,
      selectAuth,
      sql,
    ],
  );

  const itemColumns = EXPORTABLE(
    (TYPES, col, enumTableItemTypeEnumSource) => ({
      id: col({ codec: TYPES.int, notNull: true, identicalVia: "item" }),
      type: col({ codec: TYPES.text, notNull: true, via: "item" }),
      type2: col({
        codec: enumTableItemTypeEnumSource.codec,
        notNull: true,
        via: "item",
      }),
      parent_id: col({
        codec: TYPES.int,
        notNull: false,
        via: "item",
      }),
      author_id: col({
        codec: TYPES.int,
        notNull: true,
        via: "item",
      }),
      position: col({ codec: TYPES.bigint, notNull: true, via: "item" }),
      created_at: col({ codec: TYPES.timestamptz, notNull: true, via: "item" }),
      updated_at: col({ codec: TYPES.timestamptz, notNull: true, via: "item" }),
      is_explicitly_archived: col({
        codec: TYPES.boolean,
        notNull: true,
        via: "item",
      }),
      archived_at: col({
        codec: TYPES.timestamptz,
        notNull: false,
        via: "item",
      }),
    }),
    [TYPES, col, enumTableItemTypeEnumSource],
  );

  const itemRelations = EXPORTABLE(
    (personSource, relationalItemsSourceBuilder) => ({
      item: {
        source: relationalItemsSourceBuilder,
        localColumns: [`id`] as const,
        remoteColumns: [`id`] as const,
        isUnique: true,
      },
      parent: {
        source: relationalItemsSourceBuilder,
        localColumns: [`parent_id`] as const,
        remoteColumns: [`id`] as const,
        isUnique: true,
      },
      author: {
        source: personSource,
        localColumns: [`author_id`] as const,
        remoteColumns: [`person_id`] as const,
        isUnique: true,
      },
    }),
    [personSource, relationalItemsSourceBuilder],
  );

  const commentableRelation = EXPORTABLE(
    (relationalCommentableSourceBuilder) => ({
      source: relationalCommentableSourceBuilder,
      localColumns: [`id`] as const,
      remoteColumns: [`id`] as const,
      isUnique: true,
    }),
    [relationalCommentableSourceBuilder],
  );

  const relationalTopicsColumns = EXPORTABLE(
    (TYPES, col, itemColumns) => ({
      title: col({ codec: TYPES.text, notNull: false }),

      ...itemColumns,
    }),
    [TYPES, col, itemColumns],
  );
  const relationalTopicsSourceBuilder = EXPORTABLE(
    (
      PgSourceBuilder,
      executor,
      recordType,
      relationalTopicsColumns,
      selectAuth,
      sql,
    ) =>
      new PgSourceBuilder({
        executor,
        selectAuth,
        codec: recordType(
          `interfaces_and_unions.relational_topics`,
          sql`interfaces_and_unions.relational_topics`,
          relationalTopicsColumns,
        ),
        source: sql`interfaces_and_unions.relational_topics`,
        name: "relational_topics",
        uniques: [{ columns: ["id"], isPrimary: true }],
      }),
    [
      PgSourceBuilder,
      executor,
      recordType,
      relationalTopicsColumns,
      selectAuth,
      sql,
    ],
  );

  const relationalPostsColumns = EXPORTABLE(
    (TYPES, col, itemColumns) => ({
      title: col({ codec: TYPES.text, notNull: false }),
      description: col({ codec: TYPES.text, notNull: false }),
      note: col({ codec: TYPES.text, notNull: false }),

      ...itemColumns,
    }),
    [TYPES, col, itemColumns],
  );
  const relationalPostsSourceBuilder = EXPORTABLE(
    (
      PgSourceBuilder,
      executor,
      recordType,
      relationalPostsColumns,
      selectAuth,
      sql,
    ) =>
      new PgSourceBuilder({
        executor,
        selectAuth,
        codec: recordType(
          `interfaces_and_unions.relational_posts`,
          sql`interfaces_and_unions.relational_posts`,
          relationalPostsColumns,
        ),
        source: sql`interfaces_and_unions.relational_posts`,
        name: "relational_posts",
        uniques: [{ columns: ["id"], isPrimary: true }],
      }),
    [
      PgSourceBuilder,
      executor,
      recordType,
      relationalPostsColumns,
      selectAuth,
      sql,
    ],
  );

  const relationalDividersColumns = EXPORTABLE(
    (TYPES, col, itemColumns) => ({
      title: col({ codec: TYPES.text, notNull: false }),
      color: col({ codec: TYPES.text, notNull: false }),

      ...itemColumns,
    }),
    [TYPES, col, itemColumns],
  );
  const relationalDividersSourceBuilder = EXPORTABLE(
    (
      PgSourceBuilder,
      executor,
      recordType,
      relationalDividersColumns,
      selectAuth,
      sql,
    ) =>
      new PgSourceBuilder({
        executor,
        selectAuth,
        codec: recordType(
          `interfaces_and_unions.relational_dividers`,
          sql`interfaces_and_unions.relational_dividers`,
          relationalDividersColumns,
        ),
        source: sql`interfaces_and_unions.relational_dividers`,
        name: "relational_dividers",
        uniques: [{ columns: ["id"], isPrimary: true }],
      }),
    [
      PgSourceBuilder,
      executor,
      recordType,
      relationalDividersColumns,
      selectAuth,
      sql,
    ],
  );

  const relationalChecklistsColumns = EXPORTABLE(
    (TYPES, col, itemColumns) => ({
      title: col({ codec: TYPES.text, notNull: false }),

      ...itemColumns,
    }),
    [TYPES, col, itemColumns],
  );
  const relationalChecklistsSourceBuilder = EXPORTABLE(
    (
      PgSourceBuilder,
      executor,
      recordType,
      relationalChecklistsColumns,
      selectAuth,
      sql,
    ) =>
      new PgSourceBuilder({
        executor,
        selectAuth,
        codec: recordType(
          `interfaces_and_unions.relational_checklists`,
          sql`interfaces_and_unions.relational_checklists`,
          relationalChecklistsColumns,
        ),
        source: sql`interfaces_and_unions.relational_checklists`,
        name: "relational_checklists",
        uniques: [{ columns: ["id"], isPrimary: true }],
      }),
    [
      PgSourceBuilder,
      executor,
      recordType,
      relationalChecklistsColumns,
      selectAuth,
      sql,
    ],
  );

  const relationalChecklistItemsColumns = EXPORTABLE(
    (TYPES, col, itemColumns) => ({
      description: col({ codec: TYPES.text, notNull: true }),
      note: col({ codec: TYPES.text, notNull: false }),

      ...itemColumns,
    }),
    [TYPES, col, itemColumns],
  );
  const relationalChecklistItemsSourceBuilder = EXPORTABLE(
    (
      PgSourceBuilder,
      executor,
      recordType,
      relationalChecklistItemsColumns,
      selectAuth,
      sql,
    ) =>
      new PgSourceBuilder({
        executor,
        selectAuth,
        codec: recordType(
          `interfaces_and_unions.relational_checklist_items`,
          sql`interfaces_and_unions.relational_checklist_items`,
          relationalChecklistItemsColumns,
        ),
        source: sql`interfaces_and_unions.relational_checklist_items`,
        name: "relational_checklist_items",
        uniques: [{ columns: ["id"], isPrimary: true }],
      }),
    [
      PgSourceBuilder,
      executor,
      recordType,
      relationalChecklistItemsColumns,
      selectAuth,
      sql,
    ],
  );

  const relationalItemsSource = EXPORTABLE(
    (
      personSource,
      relationalChecklistItemsSourceBuilder,
      relationalChecklistsSourceBuilder,
      relationalDividersSourceBuilder,
      relationalItemsSourceBuilder,
      relationalPostsSourceBuilder,
      relationalTopicsSourceBuilder,
    ) =>
      relationalItemsSourceBuilder.build({
        relations: {
          parent: {
            source: relationalItemsSourceBuilder,
            isUnique: true,
            localColumns: ["parent_id"] as const,
            remoteColumns: ["id"] as const,
          },
          children: {
            source: relationalItemsSourceBuilder,
            isUnique: false,
            localColumns: ["id"] as const,
            remoteColumns: ["parent_id"] as const,
          },
          author: {
            source: personSource,
            isUnique: true,
            localColumns: ["author_id"] as const,
            remoteColumns: ["person_id"] as const,
          },
          topic: {
            source: relationalTopicsSourceBuilder,
            localColumns: [`id`] as const,
            remoteColumns: [`id`] as const,
            isUnique: true,
            // reciprocal: 'item',
          },
          post: {
            source: relationalPostsSourceBuilder,
            localColumns: [`id`] as const,
            remoteColumns: [`id`] as const,
            isUnique: true,
            // reciprocal: 'item',
          },
          divider: {
            source: relationalDividersSourceBuilder,
            localColumns: [`id`] as const,
            remoteColumns: [`id`] as const,
            isUnique: true,
            // reciprocal: 'item',
          },
          checklist: {
            source: relationalChecklistsSourceBuilder,
            localColumns: [`id`] as const,
            remoteColumns: [`id`] as const,
            isUnique: true,
            // reciprocal: 'item',
          },
          checklistItem: {
            source: relationalChecklistItemsSourceBuilder,
            localColumns: [`id`] as const,
            remoteColumns: [`id`] as const,
            isUnique: true,
            // reciprocal: 'item',
          },
        },
      }),
    [
      personSource,
      relationalChecklistItemsSourceBuilder,
      relationalChecklistsSourceBuilder,
      relationalDividersSourceBuilder,
      relationalItemsSourceBuilder,
      relationalPostsSourceBuilder,
      relationalTopicsSourceBuilder,
    ],
  );

  const relationalCommentableSource = EXPORTABLE(
    (
      relationalChecklistItemsSourceBuilder,
      relationalChecklistsSourceBuilder,
      relationalCommentableSourceBuilder,
      relationalPostsSourceBuilder,
    ) =>
      relationalCommentableSourceBuilder.build({
        relations: {
          post: {
            source: relationalPostsSourceBuilder,
            localColumns: [`id`] as const,
            remoteColumns: [`id`] as const,
            isUnique: true,
            // reciprocal: 'item',
          },
          checklist: {
            source: relationalChecklistsSourceBuilder,
            localColumns: [`id`] as const,
            remoteColumns: [`id`] as const,
            isUnique: true,
            // reciprocal: 'item',
          },
          checklistItem: {
            source: relationalChecklistItemsSourceBuilder,
            localColumns: [`id`] as const,
            remoteColumns: [`id`] as const,
            isUnique: true,
            // reciprocal: 'item',
          },
        },
      }),
    [
      relationalChecklistItemsSourceBuilder,
      relationalChecklistsSourceBuilder,
      relationalCommentableSourceBuilder,
      relationalPostsSourceBuilder,
    ],
  );

  const relationalTopicsSource = EXPORTABLE(
    (itemRelations, relationalTopicsSourceBuilder) =>
      relationalTopicsSourceBuilder.build({
        relations: itemRelations,
      }),
    [itemRelations, relationalTopicsSourceBuilder],
  );
  const relationalPostsSource = EXPORTABLE(
    (commentableRelation, itemRelations, relationalPostsSourceBuilder) =>
      relationalPostsSourceBuilder.build({
        relations: {
          ...itemRelations,
          commentable: commentableRelation,
        },
      }),
    [commentableRelation, itemRelations, relationalPostsSourceBuilder],
  );
  const relationalDividersSource = EXPORTABLE(
    (itemRelations, relationalDividersSourceBuilder) =>
      relationalDividersSourceBuilder.build({
        relations: itemRelations,
      }),
    [itemRelations, relationalDividersSourceBuilder],
  );
  const relationalChecklistsSource = EXPORTABLE(
    (commentableRelation, itemRelations, relationalChecklistsSourceBuilder) =>
      relationalChecklistsSourceBuilder.build({
        relations: {
          ...itemRelations,
          commentable: commentableRelation,
        },
      }),
    [commentableRelation, itemRelations, relationalChecklistsSourceBuilder],
  );
  const relationalChecklistItemsSource = EXPORTABLE(
    (
      commentableRelation,
      itemRelations,
      relationalChecklistItemsSourceBuilder,
    ) =>
      relationalChecklistItemsSourceBuilder.build({
        relations: {
          ...itemRelations,
          commentable: commentableRelation,
        },
      }),
    [commentableRelation, itemRelations, relationalChecklistItemsSourceBuilder],
  );

  ////////////////////////////////////////

  const unionItemsColumns = EXPORTABLE(
    (TYPES, col, enumTableItemTypeEnumSource, itemTypeEnumSource) => ({
      id: col({ codec: TYPES.int, notNull: true }),
      type: col({
        codec: itemTypeEnumSource.codec,
        notNull: true,
      }),
      type2: col({
        codec: enumTableItemTypeEnumSource.codec,
        notNull: true,
      }),
    }),
    [TYPES, col, enumTableItemTypeEnumSource, itemTypeEnumSource],
  );
  const unionItemsSourceBuilder = EXPORTABLE(
    (
      PgSourceBuilder,
      executor,
      recordType,
      selectAuth,
      sql,
      unionItemsColumns,
    ) =>
      new PgSourceBuilder({
        executor,
        selectAuth,
        codec: recordType(
          `interfaces_and_unions.union_items`,
          sql`interfaces_and_unions.union_items`,
          unionItemsColumns,
        ),
        source: sql`interfaces_and_unions.union_items`,
        name: "union_items",
        uniques: [{ columns: ["id"], isPrimary: true }],
      }),
    [PgSourceBuilder, executor, recordType, selectAuth, sql, unionItemsColumns],
  );

  const unionTopicsColumns = EXPORTABLE(
    (TYPES, col) => ({
      id: col({ codec: TYPES.int, notNull: true }),
      title: col({ codec: TYPES.text, notNull: false }),
    }),
    [TYPES, col],
  );
  const unionTopicsSource = EXPORTABLE(
    (PgSource, executor, recordType, selectAuth, sql, unionTopicsColumns) =>
      new PgSource({
        executor,
        selectAuth,
        codec: recordType(
          `interfaces_and_unions.union_topics`,
          sql`interfaces_and_unions.union_topics`,
          unionTopicsColumns,
        ),
        source: sql`interfaces_and_unions.union_topics`,
        name: "union_topics",
        uniques: [{ columns: ["id"], isPrimary: true }],
      }),
    [PgSource, executor, recordType, selectAuth, sql, unionTopicsColumns],
  );

  const unionPostsColumns = EXPORTABLE(
    (TYPES, col) => ({
      id: col({ codec: TYPES.int, notNull: true }),
      title: col({ codec: TYPES.text, notNull: false }),
      description: col({ codec: TYPES.text, notNull: false }),
      note: col({ codec: TYPES.text, notNull: false }),
    }),
    [TYPES, col],
  );
  const unionPostsSource = EXPORTABLE(
    (PgSource, executor, recordType, selectAuth, sql, unionPostsColumns) =>
      new PgSource({
        executor,
        selectAuth,
        codec: recordType(
          `interfaces_and_unions.union_posts`,
          sql`interfaces_and_unions.union_posts`,
          unionPostsColumns,
        ),
        source: sql`interfaces_and_unions.union_posts`,
        name: "union_posts",
        uniques: [{ columns: ["id"], isPrimary: true }],
      }),
    [PgSource, executor, recordType, selectAuth, sql, unionPostsColumns],
  );

  const unionDividersColumns = EXPORTABLE(
    (TYPES, col) => ({
      id: col({ codec: TYPES.int, notNull: true }),
      title: col({ codec: TYPES.text, notNull: false }),
      color: col({ codec: TYPES.text, notNull: false }),
    }),
    [TYPES, col],
  );
  const unionDividersSource = EXPORTABLE(
    (PgSource, executor, recordType, selectAuth, sql, unionDividersColumns) =>
      new PgSource({
        executor,
        selectAuth,
        codec: recordType(
          `interfaces_and_unions.union_dividers`,
          sql`interfaces_and_unions.union_dividers`,
          unionDividersColumns,
        ),
        source: sql`interfaces_and_unions.union_dividers`,
        name: "union_dividers",
        uniques: [{ columns: ["id"], isPrimary: true }],
      }),
    [PgSource, executor, recordType, selectAuth, sql, unionDividersColumns],
  );

  const unionChecklistsColumns = EXPORTABLE(
    (TYPES, col) => ({
      id: col({ codec: TYPES.int, notNull: true }),
      title: col({ codec: TYPES.text, notNull: false }),
    }),
    [TYPES, col],
  );
  const unionChecklistsSource = EXPORTABLE(
    (PgSource, executor, recordType, selectAuth, sql, unionChecklistsColumns) =>
      new PgSource({
        executor,
        selectAuth,
        codec: recordType(
          `interfaces_and_unions.union_checklists`,
          sql`interfaces_and_unions.union_checklists`,
          unionChecklistsColumns,
        ),
        source: sql`interfaces_and_unions.union_checklists`,
        name: "union_checklists",
        uniques: [{ columns: ["id"], isPrimary: true }],
      }),
    [PgSource, executor, recordType, selectAuth, sql, unionChecklistsColumns],
  );

  const unionChecklistItemsColumns = EXPORTABLE(
    (TYPES, col) => ({
      id: col({ codec: TYPES.int, notNull: true }),
      description: col({ codec: TYPES.text, notNull: true }),
      note: col({ codec: TYPES.text, notNull: false }),
    }),
    [TYPES, col],
  );
  const unionChecklistItemsSource = EXPORTABLE(
    (
      PgSource,
      executor,
      recordType,
      selectAuth,
      sql,
      unionChecklistItemsColumns,
    ) =>
      new PgSource({
        executor,
        selectAuth,
        codec: recordType(
          `interfaces_and_unions.union_checklist_items`,
          sql`interfaces_and_unions.union_checklist_items`,
          unionChecklistItemsColumns,
        ),
        source: sql`interfaces_and_unions.union_checklist_items`,
        name: "union_checklist_items",
        uniques: [{ columns: ["id"], isPrimary: true }],
      }),
    [
      PgSource,
      executor,
      recordType,
      selectAuth,
      sql,
      unionChecklistItemsColumns,
    ],
  );

  const unionEntitySource = EXPORTABLE(
    (PgSource, executor, recordType, selectAuth, sql, unionEntityColumns) =>
      new PgSource({
        executor,
        selectAuth,
        codec: recordType(
          `interfaces_and_unions.union__entity`,
          sql`interfaces_and_unions.union__entity`,
          unionEntityColumns,
        ),
        source: sql`(select null::interfaces_and_unions.union__entity)`,
        name: "union__entity",
      }),
    [PgSource, executor, recordType, selectAuth, sql, unionEntityColumns],
  );

  const entitySearchSource = EXPORTABLE(
    (TYPES, sql, unionEntitySource) =>
      unionEntitySource.functionSource({
        source: (...args: SQL[]) =>
          sql`interfaces_and_unions.search(${sql.join(args, ", ")})`,
        returnsSetof: true,
        returnsArray: false,
        name: "entity_search",
        parameters: [
          {
            name: "query",
            required: true,
            codec: TYPES.text,
          },
        ],
      }),
    [TYPES, sql, unionEntitySource],
  );

  const unionItemsSource = EXPORTABLE(
    (
      unionChecklistItemsSource,
      unionChecklistsSource,
      unionDividersSource,
      unionItemsSourceBuilder,
      unionPostsSource,
      unionTopicsSource,
    ) =>
      unionItemsSourceBuilder.build({
        relations: {
          topic: {
            source: unionTopicsSource,
            localColumns: [`id`] as const,
            remoteColumns: [`id`] as const,
            isUnique: true,
          },
          post: {
            source: unionPostsSource,
            localColumns: [`id`] as const,
            remoteColumns: [`id`] as const,
            isUnique: true,
          },
          divider: {
            source: unionDividersSource,
            localColumns: [`id`] as const,
            remoteColumns: [`id`] as const,
            isUnique: true,
          },
          checklist: {
            source: unionChecklistsSource,
            localColumns: [`id`] as const,
            remoteColumns: [`id`] as const,
            isUnique: true,
          },
          checklistItem: {
            source: unionChecklistItemsSource,
            localColumns: [`id`] as const,
            remoteColumns: [`id`] as const,
            isUnique: true,
          },
        },
      }),
    [
      unionChecklistItemsSource,
      unionChecklistsSource,
      unionDividersSource,
      unionItemsSourceBuilder,
      unionPostsSource,
      unionTopicsSource,
    ],
  );

  function attrField<TColumns extends PgTypeColumns>(
    attrName: keyof TColumns,
    type: GraphQLOutputType,
  ) {
    return {
      type,
      plan: EXPORTABLE(
        (attrName) =>
          function plan($entity: PgSelectSinglePlan<any, any, any, any>) {
            return $entity.get(attrName);
          },
        [attrName],
      ),
    };
  }

  function singleRelationField<
    TMyDataSource extends PgSource<any, any, any, any>,
    TRelationName extends Parameters<TMyDataSource["getRelation"]>[0],
  >(relation: TRelationName, type: GraphQLOutputType) {
    return {
      type,
      plan: EXPORTABLE(
        (deoptimizeIfAppropriate, relation) =>
          function plan($entity: PgSelectSinglePlanFromSource<TMyDataSource>) {
            const $plan = $entity.singleRelation(relation);
            deoptimizeIfAppropriate($plan);
            return $plan;
          },
        [deoptimizeIfAppropriate, relation],
      ),
    };
  }

  const HashType = new GraphQLEnumType({
    name: "HashType",
    values: {
      MD5: { value: "md5" },
      SHA1: { value: "sha1" },
      SHA256: { value: "sha256" },
    },
  });

  const Hashes: GraphQLObjectType = new GraphQLObjectType({
    name: "Hashes",
    fields: () => ({
      md5: {
        type: GraphQLString,
        resolve: EXPORTABLE(
          (crypto) =>
            function resolve(parent) {
              return crypto.createHash("md5").update(parent.text).digest("hex");
            },
          [crypto],
        ),
      },
      sha1: {
        type: GraphQLString,
        resolve: EXPORTABLE(
          (crypto) =>
            function resolve(parent) {
              return crypto
                .createHash("sha1")
                .update(parent.text)
                .digest("hex");
            },
          [crypto],
        ),
      },
      throwNonNullError: {
        type: new GraphQLNonNull(GraphQLString),
        resolve: EXPORTABLE(
          () =>
            function resolve() {
              return null;
            },
          [],
        ),
      },
      throwTestError: {
        type: GraphQLString,
        resolve: EXPORTABLE(
          () =>
            function resolve() {
              throw new Error("Test");
            },
          [],
        ),
      },
      sha256: {
        type: GraphQLString,
        resolve: EXPORTABLE(
          (crypto) =>
            function resolve(parent) {
              return crypto
                .createHash("sha256")
                .update(parent.text)
                .digest("hex");
            },
          [crypto],
        ),
      },
      self: {
        type: Hashes,
        resolve: EXPORTABLE(
          () =>
            function resolve(parent) {
              return parent;
            },
          [],
        ),
      },
    }),
  });

  const User = newObjectTypeBuilder<OurGraphQLContext, UserPlan>(
    PgSelectSinglePlan,
  )({
    name: "User",
    fields: () => ({
      username: attrField("username", GraphQLString),
      gravatarUrl: attrField("gravatar_url", GraphQLString),
      mostRecentForum: {
        type: Forum,
        plan: EXPORTABLE(
          (deoptimizeIfAppropriate, usersMostRecentForumSource) => ($user) => {
            const $forum = usersMostRecentForumSource.execute([
              { plan: $user.record() },
            ]);
            deoptimizeIfAppropriate($forum);
            return $forum;
          },
          [deoptimizeIfAppropriate, usersMostRecentForumSource],
        ),
      },

      // This field is to test standard resolvers work on planned types
      usernameHash: {
        type: GraphQLString,
        args: {
          hashType: {
            type: new GraphQLNonNull(HashType),
          },
        },
        plan: EXPORTABLE(
          (object) =>
            function plan($user) {
              return object({ username: $user.get("username") });
            },
          [object],
        ),
        resolve: EXPORTABLE(
          (crypto) =>
            function resolve(user, args) {
              return crypto
                .createHash(args.hashType)
                .update(user.username)
                .digest("hex");
            },
          [crypto],
        ),
      },
      // This field is to test standard resolvers work when returning non-scalars on planned types
      usernameHashes: {
        type: Hashes,
        plan: EXPORTABLE(
          () =>
            function plan($user) {
              return $user.get("username");
            },
          [],
        ),
        resolve: EXPORTABLE(
          () =>
            function resolve(username) {
              return { text: username };
            },
          [],
        ),
      },
    }),
  });

  const MessagesOrderBy = new GraphQLEnumType({
    name: "MessagesOrderBy",
    values: {
      BODY_ASC: {
        extensions: {
          graphile: {
            plan: EXPORTABLE(
              (TYPES, sql) =>
                (plan: PgSelectPlanFromSource<typeof messageSource>) => {
                  plan.orderBy({
                    codec: TYPES.text,
                    fragment: sql`${plan.alias}.body`,
                    direction: "ASC",
                  });
                },
              [TYPES, sql],
            ),
          },
        },
      },
      BODY_DESC: {
        extensions: {
          graphile: {
            plan: EXPORTABLE(
              (TYPES, sql) =>
                (plan: PgSelectPlanFromSource<typeof messageSource>) => {
                  plan.orderBy({
                    codec: TYPES.text,
                    fragment: sql`${plan.alias}.body`,
                    direction: "DESC",
                  });
                },
              [TYPES, sql],
            ),
          },
        },
      },
      AUTHOR_USERNAME_ASC: {
        extensions: {
          graphile: {
            plan: EXPORTABLE(
              (TYPES, sql) =>
                (plan: PgSelectPlanFromSource<typeof messageSource>) => {
                  const authorAlias = plan.singleRelation("author");
                  plan.orderBy({
                    codec: TYPES.text,
                    fragment: sql`${authorAlias}.username`,
                    direction: "ASC",
                  });
                },
              [TYPES, sql],
            ),
          },
        },
      },
      AUTHOR_USERNAME_DESC: {
        extensions: {
          graphile: {
            plan: EXPORTABLE(
              (TYPES, sql) =>
                (plan: PgSelectPlanFromSource<typeof messageSource>) => {
                  const authorAlias = plan.singleRelation("author");
                  plan.orderBy({
                    codec: TYPES.text,
                    fragment: sql`${authorAlias}.username`,
                    direction: "DESC",
                  });
                },
              [TYPES, sql],
            ),
          },
        },
      },
    },
  });
  const Message = newObjectTypeBuilder<OurGraphQLContext, MessagePlan>(
    PgSelectSinglePlan,
  )({
    name: "Message",
    fields: () => ({
      id: attrField("id", GraphQLString),
      featured: attrField("featured", GraphQLBoolean),
      body: attrField("body", GraphQLString),
      forum: singleRelationField("forum", Forum),
      author: {
        type: User,
        plan: EXPORTABLE(
          (deoptimizeIfAppropriate) =>
            function plan($message) {
              const $user = $message.singleRelation("author");
              deoptimizeIfAppropriate($user);

              return $user;
            },
          [deoptimizeIfAppropriate],
        ),
      },
      isArchived: attrField("is_archived", GraphQLBoolean),
    }),
  });

  const MessageEdge = newObjectTypeBuilder<OurGraphQLContext, MessagePlan>(
    PgSelectSinglePlan,
  )({
    name: "MessageEdge",
    fields: {
      cursor: {
        type: GraphQLString,
        plan: EXPORTABLE(
          () =>
            function plan($node) {
              return $node.cursor();
            },
          [],
        ),
      },
      node: {
        type: Message,
        plan: EXPORTABLE(
          () =>
            function plan($node) {
              return $node;
            },
          [],
        ),
      },
    },
  });

  const PageInfo = newObjectTypeBuilder<OurGraphQLContext, PgPageInfoPlan<any>>(
    PgPageInfoPlan,
  )({
    name: "PageInfo",
    fields: {
      hasNextPage: {
        type: new GraphQLNonNull(GraphQLBoolean),
        plan: EXPORTABLE(() => ($pageInfo) => $pageInfo.hasNextPage(), []),
      },
      hasPreviousPage: {
        type: new GraphQLNonNull(GraphQLBoolean),
        plan: EXPORTABLE(() => ($pageInfo) => $pageInfo.hasPreviousPage(), []),
      },
      startCursor: {
        type: GraphQLString,
        plan: EXPORTABLE(() => ($pageInfo) => $pageInfo.startCursor(), []),
      },
      endCursor: {
        type: GraphQLString,
        plan: EXPORTABLE(() => ($pageInfo) => $pageInfo.endCursor(), []),
      },
    },
  });

  const MessagesConnection = newObjectTypeBuilder<
    OurGraphQLContext,
    MessageConnectionPlan
  >(ConnectionPlan)({
    name: "MessagesConnection",
    fields: {
      edges: {
        type: new GraphQLList(MessageEdge),
        plan: EXPORTABLE(
          () =>
            function plan($connection) {
              return $connection.edges();
            },
          [],
        ),
      },
      nodes: newGraphileFieldConfigBuilder<
        OurGraphQLContext,
        MessageConnectionPlan
      >()({
        type: new GraphQLList(Message),
        plan: EXPORTABLE(
          () =>
            function plan($connection) {
              return $connection.nodes() as any;
            },
          [],
        ),
      }),
      pageInfo: newGraphileFieldConfigBuilder<
        OurGraphQLContext,
        MessageConnectionPlan
      >()({
        type: new GraphQLNonNull(PageInfo),
        plan: EXPORTABLE(
          () =>
            function plan($connection) {
              // return context();
              return $connection.pageInfo() as any;
            },
          [],
        ),
      }),
      totalCount: {
        type: new GraphQLNonNull(GraphQLInt),
        plan: EXPORTABLE(
          (TYPES, sql) => ($connection) =>
            $connection
              .cloneSubplanWithoutPagination("aggregate")
              .single()
              .select(sql`count(*)`, TYPES.bigint),
          [TYPES, sql],
        ),
      },
    },
  });

  const IncludeArchived = new GraphQLEnumType({
    name: "IncludeArchived",
    values: {
      INHERIT: {
        value: "INHERIT",
      },
      YES: {
        value: "YES",
      },
      NO: {
        value: "NO",
      },
      EXCLUSIVELY: {
        value: "EXCLUSIVELY",
      },
    },
  });

  function makeIncludeArchivedField<TFieldPlan>(
    getClassPlan: ($fieldPlan: TFieldPlan) => PgSelectPlanFromSource<any>,
  ) {
    return {
      type: IncludeArchived,
      plan: EXPORTABLE(
        (PgSelectSinglePlan, TYPES, getClassPlan, sql) =>
          function plan(
            $parent: ExecutablePlan<any>,
            $field: TFieldPlan,
            $value: __InputStaticLeafPlan | __TrackedObjectPlan,
          ) {
            const $messages = getClassPlan($field);
            if ($value.evalIs("YES")) {
              // No restriction
            } else if ($value.evalIs("EXCLUSIVELY")) {
              $messages.where(sql`${$messages.alias}.archived_at is not null`);
            } else if (
              $value.evalIs("INHERIT") &&
              // INHERIT only works if the parent has an archived_at column.
              $parent instanceof PgSelectSinglePlan &&
              !!$parent.source.codec.columns.archived_at
            ) {
              $messages.where(
                sql`(${
                  $messages.alias
                }.archived_at is null) = (${$messages.placeholder(
                  $parent.get("archived_at"),
                  TYPES.timestamptz,
                )} is null)`,
              );
            } else {
              $messages.where(sql`${$messages.alias}.archived_at is null`);
            }
          },
        [PgSelectSinglePlan, TYPES, getClassPlan, sql],
      ),
      defaultValue: "INHERIT",
    };
  }

  const MessageCondition = newInputObjectTypeBuilder<
    OurGraphQLContext,
    PgConditionPlan<any>
  >()({
    name: "MessageCondition",
    fields: {
      featured: {
        type: GraphQLBoolean,
        plan: EXPORTABLE(
          (TYPES, sql) =>
            function plan($condition, $value) {
              if ($value.evalIs(null)) {
                $condition.where(sql`${$condition.alias}.featured is null`);
              } else {
                $condition.where(
                  sql`${$condition.alias}.featured = ${$condition.placeholder(
                    $value,
                    TYPES.boolean,
                  )}`,
                );
              }
            },
          [TYPES, sql],
        ),
      },
    },
  });

  const BooleanFilter = newInputObjectTypeBuilder<
    OurGraphQLContext,
    BooleanFilterPlan
  >()({
    name: "BooleanFilter",
    fields: {
      equalTo: {
        type: GraphQLBoolean,
        plan: EXPORTABLE(
          (TYPES, sql) =>
            function plan($parent, $value) {
              if ($value.evalIs(null)) {
                // Ignore
              } else {
                $parent.where(
                  sql`${$parent.expression} = ${$parent.placeholder(
                    $value,
                    TYPES.boolean,
                  )}`,
                );
              }
            },
          [TYPES, sql],
        ),
      },
      notEqualTo: {
        type: GraphQLBoolean,
        plan: EXPORTABLE(
          (TYPES, sql) =>
            function plan($parent: BooleanFilterPlan, $value) {
              if ($value.evalIs(null)) {
                // Ignore
              } else {
                $parent.where(
                  sql`${$parent.expression} <> ${$parent.placeholder(
                    $value,
                    TYPES.boolean,
                  )}`,
                );
              }
            },
          [TYPES, sql],
        ),
      },
    },
  });

  const MessageFilter = newInputObjectTypeBuilder<
    OurGraphQLContext,
    ClassFilterPlan
  >()({
    name: "MessageFilter",
    fields: {
      featured: {
        type: BooleanFilter,
        plan: EXPORTABLE(
          (BooleanFilterPlan, sql) =>
            function plan($messageFilter, $value) {
              if ($value.evalIs(null)) {
                // Ignore
              } else {
                return new BooleanFilterPlan(
                  $messageFilter,
                  sql`${$messageFilter.alias}.featured`,
                );
              }
            },
          [BooleanFilterPlan, sql],
        ),
      },
    },
  });

  const ForumCondition = newInputObjectTypeBuilder<
    OurGraphQLContext,
    PgConditionPlan<any>
  >()({
    name: "ForumCondition",
    fields: {
      name: {
        type: GraphQLString,
        plan: EXPORTABLE(
          (TYPES, sql) =>
            function plan($condition, $value) {
              if ($value.evalIs(null)) {
                $condition.where(sql`${$condition.alias}.name is null`);
              } else {
                $condition.where(
                  sql`${$condition.alias}.name = ${$condition.placeholder(
                    $value,
                    TYPES.text,
                  )}`,
                );
              }
            },
          [TYPES, sql],
        ),
      },
    },
  });

  const ForumToManyMessageFilter = newInputObjectTypeBuilder<
    OurGraphQLContext,
    ManyFilterPlan<typeof messageSource>
  >()({
    name: "ForumToManyMessageFilter",
    fields: {
      some: {
        type: MessageFilter,
        plan: EXPORTABLE(
          () =>
            function plan($manyFilter, $value) {
              if (!$value.evalIs(null)) {
                return $manyFilter.some();
              }
            },
          [],
        ),
      },
    },
  });

  const ForumFilter = newInputObjectTypeBuilder<
    OurGraphQLContext,
    ClassFilterPlan
  >()({
    name: "ForumFilter",
    fields: {
      messages: {
        type: ForumToManyMessageFilter,
        plan: EXPORTABLE(
          (ManyFilterPlan, messageSource) =>
            function plan($condition, $value) {
              if (!$value.evalIs(null)) {
                return new ManyFilterPlan(
                  $condition,
                  messageSource,
                  ["id"],
                  ["forum_id"],
                );
              }
            },
          [ManyFilterPlan, messageSource],
        ),
      },
    },
  });

  const Forum: GraphQLObjectType<any, OurGraphQLContext> = newObjectTypeBuilder<
    OurGraphQLContext,
    ForumPlan
  >(PgSelectSinglePlan)({
    name: "Forum",
    fields: () => ({
      id: attrField("id", GraphQLString),
      name: attrField("name", GraphQLString),

      // Expression column
      isArchived: attrField("is_archived", GraphQLBoolean),

      // Custom expression; actual column select shouldn't make it through to the generated query.
      archivedAtIsNotNull: {
        type: GraphQLBoolean,
        plan: EXPORTABLE(
          (TYPES, pgClassExpression) =>
            function plan($forum) {
              const $archivedAt = $forum.get("archived_at");
              const $expr1 = pgClassExpression(
                $forum,
                TYPES.boolean,
              )`${$archivedAt} is not null`;
              const $expr2 = pgClassExpression(
                $forum,
                TYPES.boolean,
              )`${$expr1} is true`;
              return $expr2;
            },
          [TYPES, pgClassExpression],
        ),
      },
      self: {
        type: Forum,
        plan: EXPORTABLE(
          () =>
            function plan($forum) {
              return $forum;
            },
          [],
        ),
      },
      messagesList: {
        type: new GraphQLList(Message),
        args: {
          first: {
            type: GraphQLInt,
            plan: EXPORTABLE(
              () =>
                function plan(
                  _$forum,
                  $messages: PgSelectPlanFromSource<typeof messageSource>,
                  $value,
                ) {
                  $messages.setFirst($value);
                  return null;
                },
              [],
            ),
          },
          condition: {
            type: MessageCondition,
            plan: EXPORTABLE(
              () =>
                function plan(
                  _$forum,
                  $messages: PgSelectPlanFromSource<typeof messageSource>,
                ) {
                  return $messages.wherePlan();
                },
              [],
            ),
          },
          filter: {
            type: MessageFilter,
            plan: EXPORTABLE(
              (ClassFilterPlan) =>
                function plan(
                  _$forum,
                  $messages: PgSelectPlanFromSource<typeof messageSource>,
                ) {
                  return new ClassFilterPlan(
                    $messages.wherePlan(),
                    $messages.alias,
                  );
                },
              [ClassFilterPlan],
            ),
          },
          includeArchived: makeIncludeArchivedField<
            PgSelectPlanFromSource<typeof messageSource>
          >(($messages) => $messages),
        },
        plan: EXPORTABLE(
          (deoptimizeIfAppropriate, messageSource) =>
            function plan($forum) {
              const $forumId = $forum.get("id");
              const $messages = messageSource.find({ forum_id: $forumId });
              deoptimizeIfAppropriate($messages);
              $messages.setTrusted();
              // $messages.leftJoin(...);
              // $messages.innerJoin(...);
              // $messages.relation('fk_messages_author_id')
              // $messages.where(...);
              // $messages.orderBy(...);
              return $messages;
            },
          [deoptimizeIfAppropriate, messageSource],
        ),
      },
      messagesConnection: {
        type: MessagesConnection,
        args: {
          first: {
            type: GraphQLInt,
            plan: EXPORTABLE(
              () =>
                function plan(
                  _$forum,
                  $connection: PgConnectionPlanFromSource<typeof messageSource>,
                  $value,
                ) {
                  $connection.setFirst($value);
                  return null;
                },
              [],
            ),
          },
          last: {
            type: GraphQLInt,
            plan: EXPORTABLE(
              () =>
                function plan(
                  _$root,
                  $connection: PgConnectionPlanFromSource<typeof messageSource>,
                  $value,
                ) {
                  $connection.setLast($value);
                  return null;
                },
              [],
            ),
          },
          condition: {
            type: MessageCondition,
            plan: EXPORTABLE(
              () =>
                function plan(
                  _$forum,
                  $connection: PgConnectionPlanFromSource<typeof messageSource>,
                ) {
                  const $messages = $connection.getSubplan();
                  return $messages.wherePlan();
                },
              [],
            ),
          },
          filter: {
            type: MessageFilter,
            plan: EXPORTABLE(
              (ClassFilterPlan) =>
                function plan(
                  _$forum,
                  $connection: PgConnectionPlanFromSource<typeof messageSource>,
                ) {
                  const $messages = $connection.getSubplan();
                  return new ClassFilterPlan(
                    $messages.wherePlan(),
                    $messages.alias,
                  );
                },
              [ClassFilterPlan],
            ),
          },
          includeArchived: makeIncludeArchivedField<
            PgConnectionPlanFromSource<typeof messageSource>
          >(($connection) => $connection.getSubplan()),
        },
        plan: EXPORTABLE(
          (connection, deoptimizeIfAppropriate, messageSource) =>
            function plan($forum) {
              const $messages = messageSource.find({
                forum_id: $forum.get("id"),
              });
              $messages.setTrusted();
              deoptimizeIfAppropriate($messages);
              // $messages.leftJoin(...);
              // $messages.innerJoin(...);
              // $messages.relation('fk_messages_author_id')
              // $messages.where(...);
              const $connectionPlan = connection($messages);
              // $connectionPlan.orderBy... ?
              // DEFINITELY NOT $messages.orderBy BECAUSE we don't want that applied to aggregates.
              // DEFINITELY NOT $messages.limit BECAUSE we don't want those limits applied to aggregates or page info.
              return $connectionPlan;
            },
          [connection, deoptimizeIfAppropriate, messageSource],
        ),
      },
      uniqueAuthorCount: {
        type: GraphQLInt,
        args: {
          featured: {
            type: GraphQLBoolean,
          },
        },
        plan: EXPORTABLE(
          (TYPES, forumsUniqueAuthorCountSource) =>
            function plan($forum, args) {
              const $featured = args.featured;
              return forumsUniqueAuthorCountSource.execute([
                {
                  plan: $forum.record(),
                },
                {
                  plan: $featured,
                  pgCodec: TYPES.boolean,
                },
              ]);
            },
          [TYPES, forumsUniqueAuthorCountSource],
        ),
      },

      randomUser: {
        type: User,
        plan: EXPORTABLE(
          (deoptimizeIfAppropriate, pgSelect, sql, userSource) =>
            function plan($forum) {
              const $user = pgSelect({
                source: userSource,
                identifiers: [],
                args: [
                  {
                    plan: $forum.record(),
                  },
                ],
                from: (...args: SQL[]) =>
                  sql`app_public.forums_random_user(${sql.join(args, ", ")})`,
                name: "forums_random_user",
              }).single();
              deoptimizeIfAppropriate($user);
              return $user;
            },
          [deoptimizeIfAppropriate, pgSelect, sql, userSource],
        ),
      },

      featuredMessages: {
        type: new GraphQLList(Message),
        plan: EXPORTABLE(
          (deoptimizeIfAppropriate, forumsFeaturedMessages) =>
            function plan($forum) {
              const $messages = forumsFeaturedMessages.execute([
                {
                  plan: $forum.record(),
                },
              ]);
              deoptimizeIfAppropriate($messages);
              return $messages;
            },
          [deoptimizeIfAppropriate, forumsFeaturedMessages],
        ),
      },

      messagesListSet: {
        type: new GraphQLList(new GraphQLList(Message)),
        plan: EXPORTABLE(
          (deoptimizeIfAppropriate, forumsMessagesListSetSource) =>
            function plan($forum) {
              const $partitionedMessages = forumsMessagesListSetSource.execute([
                {
                  plan: $forum.record(),
                },
              ]);
              deoptimizeIfAppropriate($partitionedMessages);
              return $partitionedMessages;
            },
          [deoptimizeIfAppropriate, forumsMessagesListSetSource],
        ),
      },

      messagesWithManyTransforms: {
        type: new GraphQLList(new GraphQLList(Message)),
        plan: EXPORTABLE(
          (
            deoptimizeIfAppropriate,
            each,
            filter,
            groupBy,
            lambda,
            list,
            messageSource,
          ) =>
            function plan($forum) {
              // This is a deliberately convoluted plan to ensure that multiple
              // filter plans work well together.

              // Load _all_ the messages from the DB.
              const $messages = messageSource.find();
              deoptimizeIfAppropriate($messages);

              // Filter messages to those _not_ in this forum
              const $messagesFromOtherForums = filter($messages, ($message) =>
                lambda(
                  list([$message.get("forum_id"), $forum.get("id")]),
                  ([messageForumId, forumId]) => messageForumId !== forumId,
                ),
              );

              // Group messages by the "featured" property
              const $grouped = groupBy($messagesFromOtherForums, ($message) =>
                ($message as unknown as MessagePlan).get("featured"),
              );

              // Since `groupBy` results in a `Map`, turn it into an array by just getting the values
              const $entries = lambda($grouped, (map) => [...map.values()]);

              // Now map over the resulting list of list of values and wrap with the message list item plan.
              return each($entries, ($group) =>
                each($group, ($item) => $messages.listItem($item)),
              );
            },
          [
            deoptimizeIfAppropriate,
            each,
            filter,
            groupBy,
            lambda,
            list,
            messageSource,
          ],
        ),
      },
    }),
  });

  const singleTableTypeNameCallback = EXPORTABLE(
    () => (v: string) => {
      if (v == null) {
        return v;
      }
      const type = {
        TOPIC: "SingleTableTopic",
        POST: "SingleTablePost",
        DIVIDER: "SingleTableDivider",
        CHECKLIST: "SingleTableChecklist",
        CHECKLIST_ITEM: "SingleTableChecklistItem",
      }[v];
      if (!type) {
        throw new Error(`Could not determine type for '${v}'`);
      }
      return type;
    },
    [],
  );

  const singleTableTypeName = EXPORTABLE(
    (lambda, singleTableTypeNameCallback) => ($entity: SingleTableItemPlan) => {
      const $type = $entity.get("type");
      const $typeName = lambda($type, singleTableTypeNameCallback);
      return $typeName;
    },
    [lambda, singleTableTypeNameCallback],
  );

  const singleTableItemInterface = EXPORTABLE(
    (pgSingleTablePolymorphic, singleTableTypeName) =>
      ($item: SingleTableItemPlan) =>
        pgSingleTablePolymorphic(singleTableTypeName($item), $item),
    [pgSingleTablePolymorphic, singleTableTypeName],
  );

  const relationalItemPolymorphicTypeMap = EXPORTABLE(
    (
      deoptimizeIfAppropriate,
    ): PgPolymorphicTypeMap<RelationalItemPlan, string> => ({
      RelationalTopic: {
        match: (t) => t === "TOPIC",
        plan: (_, $item) =>
          deoptimizeIfAppropriate($item.singleRelation("topic")),
      },
      RelationalPost: {
        match: (t) => t === "POST",
        plan: (_, $item) =>
          deoptimizeIfAppropriate($item.singleRelation("post")),
      },
      RelationalDivider: {
        match: (t) => t === "DIVIDER",
        plan: (_, $item) =>
          deoptimizeIfAppropriate($item.singleRelation("divider")),
      },
      RelationalChecklist: {
        match: (t) => t === "CHECKLIST",
        plan: (_, $item) =>
          deoptimizeIfAppropriate($item.singleRelation("checklist")),
      },
      RelationalChecklistItem: {
        match: (t) => t === "CHECKLIST_ITEM",
        plan: (_, $item) =>
          deoptimizeIfAppropriate($item.singleRelation("checklistItem")),
      },
    }),
    [deoptimizeIfAppropriate],
  );

  const relationalItemInterface = EXPORTABLE(
    (pgPolymorphic, relationalItemPolymorphicTypeMap) =>
      ($item: RelationalItemPlan) =>
        pgPolymorphic(
          $item,
          $item.get("type"),
          relationalItemPolymorphicTypeMap,
        ),
    [pgPolymorphic, relationalItemPolymorphicTypeMap],
  );

  const unionItemPolymorphicTypeMap = EXPORTABLE(
    (deoptimizeIfAppropriate): PgPolymorphicTypeMap<UnionItemPlan, string> => ({
      UnionTopic: {
        match: (t) => t === "TOPIC",
        plan: (_, $item) =>
          deoptimizeIfAppropriate($item.singleRelation("topic")),
      },
      UnionPost: {
        match: (t) => t === "POST",
        plan: (_, $item) =>
          deoptimizeIfAppropriate($item.singleRelation("post")),
      },
      UnionDivider: {
        match: (t) => t === "DIVIDER",
        plan: (_, $item) =>
          deoptimizeIfAppropriate($item.singleRelation("divider")),
      },
      UnionChecklist: {
        match: (t) => t === "CHECKLIST",
        plan: (_, $item) =>
          deoptimizeIfAppropriate($item.singleRelation("checklist")),
      },
      UnionChecklistItem: {
        match: (t) => t === "CHECKLIST_ITEM",
        plan: (_, $item) =>
          deoptimizeIfAppropriate($item.singleRelation("checklistItem")),
      },
    }),
    [deoptimizeIfAppropriate],
  );

  const unionItemUnion = EXPORTABLE(
    (pgPolymorphic, unionItemPolymorphicTypeMap) => ($item: UnionItemPlan) =>
      pgPolymorphic($item, $item.get("type"), unionItemPolymorphicTypeMap),
    [pgPolymorphic, unionItemPolymorphicTypeMap],
  );

  const relationalCommentablePolymorphicTypeMap = EXPORTABLE(
    (
      deoptimizeIfAppropriate,
    ): PgPolymorphicTypeMap<RelationalCommentablePlan, string> => ({
      RelationalPost: {
        match: (t) => t === "POST",
        plan: (_, $item) =>
          deoptimizeIfAppropriate($item.singleRelation("post")),
      },
      RelationalChecklist: {
        match: (t) => t === "CHECKLIST",
        plan: (_, $item) =>
          deoptimizeIfAppropriate($item.singleRelation("checklist")),
      },
      RelationalChecklistItem: {
        match: (t) => t === "CHECKLIST_ITEM",
        plan: (_, $item) =>
          deoptimizeIfAppropriate($item.singleRelation("checklistItem")),
      },
    }),
    [deoptimizeIfAppropriate],
  );

  const relationalCommentableInterface = EXPORTABLE(
    (pgPolymorphic, relationalCommentablePolymorphicTypeMap) =>
      ($item: RelationalCommentablePlan) =>
        pgPolymorphic(
          $item,
          $item.get("type"),
          relationalCommentablePolymorphicTypeMap,
        ),
    [pgPolymorphic, relationalCommentablePolymorphicTypeMap],
  );

  const entityPolymorphicTypeMap = EXPORTABLE(
    (
      commentSource,
      personSource,
      postSource,
    ): PgPolymorphicTypeMap<
      | PgSelectSinglePlan<any, any, any, any>
      | PgClassExpressionPlan<
          any,
          PgTypeCodec<any, any, any>,
          any,
          any,
          any,
          any
        >,
      number[],
      ListPlan<ExecutablePlan<number>[]>
    > => ({
      Person: {
        match: (v) => v[0] != null,
        plan: ($list) => personSource.get({ person_id: $list.at(0) }),
      },
      Post: {
        match: (v) => v[1] != null,
        plan: ($list) => postSource.get({ post_id: $list.at(1) }),
      },
      Comment: {
        match: (v) => v[2] != null,
        plan: ($list) => commentSource.get({ comment_id: $list.at(2) }),
      },
    }),
    [commentSource, personSource, postSource],
  );

  /**
   * This makes a polymorphic plan that returns the "entity" represented by the
   * "interfaces_and_unions.union__entity" type in the database (a composite
   * type with an attribute that's a "foreign key" to each table that's
   * included in the union).
   *
   * i.e. if `$item.get('person_id')` is set, then it's a Person and we should
   * grab that person from the `personSource`. If `post_id` is set it's a Post,
   * and so on.
   */
  const entityUnion = EXPORTABLE(
    (PgSelectSinglePlan, entityPolymorphicTypeMap, list, pgPolymorphic) =>
      <TColumns extends typeof unionEntityColumns>(
        $item:
          | PgSelectSinglePlan<TColumns, any, any, any>
          | PgClassExpressionPlan<
              TColumns,
              PgTypeCodec<TColumns, any, any>,
              any,
              any,
              any,
              any
            >,
      ) =>
        pgPolymorphic(
          $item,
          list([
            // TODO: this ridiculous code is just to appease TypeScript; we should
            // be able to just `$item.get("person_id")`.
            $item instanceof PgSelectSinglePlan
              ? $item.get("person_id")
              : $item.get("person_id"),
            $item instanceof PgSelectSinglePlan
              ? $item.get("post_id")
              : $item.get("post_id"),
            $item instanceof PgSelectSinglePlan
              ? $item.get("comment_id")
              : $item.get("comment_id"),
          ]),
          entityPolymorphicTypeMap,
        ),
    [PgSelectSinglePlan, entityPolymorphicTypeMap, list, pgPolymorphic],
  );

  const PersonBookmark: GraphQLObjectType<any, OurGraphQLContext> =
    newObjectTypeBuilder<OurGraphQLContext, PersonBookmarkPlan>(
      PgSelectSinglePlan,
    )({
      name: "PersonBookmark",
      fields: () => ({
        id: attrField("id", GraphQLInt),
        person: singleRelationField("person", Person),
        bookmarkedEntity: {
          type: Entity,
          plan: EXPORTABLE(
            (entityUnion) =>
              function plan($personBookmark) {
                const $entity = $personBookmark.get("bookmarked_entity");
                return entityUnion($entity);
              },
            [entityUnion],
          ),
        },
      }),
    });

  const Person: GraphQLObjectType<any, OurGraphQLContext> =
    newObjectTypeBuilder<OurGraphQLContext, PersonPlan>(PgSelectSinglePlan)({
      name: "Person",
      fields: () => ({
        personId: attrField("person_id", GraphQLInt),
        username: attrField("username", GraphQLString),
        singleTableItemsList: {
          type: new GraphQLList(SingleTableItem),
          plan: EXPORTABLE(
            (
              deoptimizeIfAppropriate,
              each,
              singleTableItemInterface,
              singleTableItemsSource,
            ) =>
              function plan($person) {
                const $personId = $person.get("person_id");
                const $items: SingleTableItemsPlan =
                  singleTableItemsSource.find({
                    author_id: $personId,
                  });
                deoptimizeIfAppropriate($items);
                return each($items, singleTableItemInterface);
              },
            [
              deoptimizeIfAppropriate,
              each,
              singleTableItemInterface,
              singleTableItemsSource,
            ],
          ),
        },

        relationalItemsList: {
          type: new GraphQLList(RelationalItem),
          plan: EXPORTABLE(
            (
              deoptimizeIfAppropriate,
              each,
              relationalItemInterface,
              relationalItemsSource,
            ) =>
              function plan($person) {
                const $personId = $person.get("person_id");
                const $items: RelationalItemsPlan = relationalItemsSource.find({
                  author_id: $personId,
                });
                deoptimizeIfAppropriate($items);
                return each($items, ($item) => relationalItemInterface($item));
              },
            [
              deoptimizeIfAppropriate,
              each,
              relationalItemInterface,
              relationalItemsSource,
            ],
          ),
        },

        personBookmarksList: {
          type: new GraphQLList(PersonBookmark),
          plan: EXPORTABLE(
            () =>
              function plan($person) {
                return $person.manyRelation("personBookmarks");
              },
            [],
          ),
        },
      }),
    });

  const Post: GraphQLObjectType<any, OurGraphQLContext> = newObjectTypeBuilder<
    OurGraphQLContext,
    PostPlan
  >(PgSelectSinglePlan)({
    name: "Post",
    fields: () => ({
      postId: attrField("post_id", GraphQLInt),
      body: attrField("body", GraphQLString),
      author: singleRelationField("author", Person),
    }),
  });

  const Comment: GraphQLObjectType<any, OurGraphQLContext> =
    newObjectTypeBuilder<OurGraphQLContext, CommentPlan>(PgSelectSinglePlan)({
      name: "Comment",
      fields: () => ({
        commentId: attrField("comment_id", GraphQLInt),
        author: singleRelationField("author", Person),
        post: singleRelationField("post", Post),
        body: attrField("body", GraphQLString),
      }),
    });

  ////////////////////////////////////////

  const SingleTableItem: GraphQLInterfaceType = new GraphQLInterfaceType({
    name: "SingleTableItem",
    fields: () => ({
      id: { type: GraphQLInt },
      type: { type: GraphQLString },
      type2: { type: EnumTableItemType },
      parent: { type: SingleTableItem },
      author: { type: Person },
      position: { type: GraphQLString },
      createdAt: { type: GraphQLString },
      updatedAt: { type: GraphQLString },
      isExplicitlyArchived: { type: GraphQLBoolean },
      archivedAt: { type: GraphQLString },
    }),
    resolveType,
  });

  const commonSingleTableItemFields = {
    id: attrField("id", GraphQLInt),
    type: attrField("type", GraphQLString),
    type2: attrField("type2", EnumTableItemType),
    parent: {
      type: SingleTableItem,
      plan: EXPORTABLE(
        (deoptimizeIfAppropriate, singleTableItemInterface) =>
          function plan($entity: SingleTableItemPlan) {
            const $plan = $entity.singleRelation("parent");
            deoptimizeIfAppropriate($plan);
            return singleTableItemInterface($plan);
          },
        [deoptimizeIfAppropriate, singleTableItemInterface],
      ),
    },
    author: singleRelationField("author", Person),
    position: attrField("position", GraphQLString),
    createdAt: attrField("created_at", GraphQLString),
    updatedAt: attrField("updated_at", GraphQLString),
    isExplicitlyArchived: attrField("is_explicitly_archived", GraphQLBoolean),
    archivedAt: attrField("archived_at", GraphQLString),
  };

  const SingleTableTopic = newObjectTypeBuilder<
    OurGraphQLContext,
    SingleTableItemPlan
  >(PgSelectSinglePlan)({
    name: "SingleTableTopic",
    interfaces: [SingleTableItem],
    fields: () => ({
      ...commonSingleTableItemFields,
      title: attrField("title", GraphQLString),
    }),
  });

  const SingleTablePost = newObjectTypeBuilder<
    OurGraphQLContext,
    SingleTableItemPlan
  >(PgSelectSinglePlan)({
    name: "SingleTablePost",
    interfaces: [SingleTableItem],
    fields: () => ({
      ...commonSingleTableItemFields,
      title: attrField("title", GraphQLString),
      description: attrField("description", GraphQLString),
      note: attrField("note", GraphQLString),
    }),
  });

  const SingleTableDivider = newObjectTypeBuilder<
    OurGraphQLContext,
    SingleTableItemPlan
  >(PgSelectSinglePlan)({
    name: "SingleTableDivider",
    interfaces: [SingleTableItem],
    fields: () => ({
      ...commonSingleTableItemFields,
      title: attrField("title", GraphQLString),
      color: attrField("color", GraphQLString),
    }),
  });

  const SingleTableChecklist = newObjectTypeBuilder<
    OurGraphQLContext,
    SingleTableItemPlan
  >(PgSelectSinglePlan)({
    name: "SingleTableChecklist",
    interfaces: [SingleTableItem],
    fields: () => ({
      ...commonSingleTableItemFields,
      title: attrField("title", GraphQLString),
    }),
  });

  const SingleTableChecklistItem = newObjectTypeBuilder<
    OurGraphQLContext,
    SingleTableItemPlan
  >(PgSelectSinglePlan)({
    name: "SingleTableChecklistItem",
    interfaces: [SingleTableItem],
    fields: () => ({
      ...commonSingleTableItemFields,
      description: attrField("description", GraphQLString),
      note: attrField("note", GraphQLString),
    }),
  });

  ////////////////////////////////////////

  const RelationalItem: GraphQLInterfaceType = new GraphQLInterfaceType({
    name: "RelationalItem",
    fields: () => ({
      id: { type: GraphQLInt },
      type: { type: GraphQLString },
      type2: { type: EnumTableItemType },
      parent: { type: RelationalItem },
      author: { type: Person },
      position: { type: GraphQLString },
      createdAt: { type: GraphQLString },
      updatedAt: { type: GraphQLString },
      isExplicitlyArchived: { type: GraphQLBoolean },
      archivedAt: { type: GraphQLString },
    }),
    resolveType,
  });

  const RelationalCommentable: GraphQLInterfaceType = new GraphQLInterfaceType({
    name: "RelationalCommentable",
    fields: () => ({
      id: { type: GraphQLInt },
      type: { type: GraphQLString },
      type2: { type: EnumTableItemType },
    }),
    resolveType,
  });

  // NOTE: the `| any`s below are because of co/contravariance woes.
  type CommonRelationalItemColumns = {
    id: PgTypeColumn<number>;
    type: PgTypeColumn<string>;
    type2: PgTypeColumn<string>;
    position: PgTypeColumn<string>;
    created_at: PgTypeColumn<Date>;
    updated_at: PgTypeColumn<Date>;
    is_explicitly_archived: PgTypeColumn<boolean>;
    archived_at: PgTypeColumn<Date>;
  };
  const commonRelationalItemFields = () => ({
    id: attrField<CommonRelationalItemColumns>("id", GraphQLInt),
    type: attrField<CommonRelationalItemColumns>("type", GraphQLString),
    type2: attrField<CommonRelationalItemColumns>("type2", EnumTableItemType),
    parent: {
      type: RelationalItem,
      plan: EXPORTABLE(
        (deoptimizeIfAppropriate, relationalItemInterface) =>
          function plan($entity: PgSelectSinglePlan<any, any, any, any>) {
            const $plan = $entity.singleRelation("parent");
            deoptimizeIfAppropriate($plan);
            return relationalItemInterface($plan);
          },
        [deoptimizeIfAppropriate, relationalItemInterface],
      ),
    },
    author: singleRelationField("author", Person),
    position: attrField<CommonRelationalItemColumns>("position", GraphQLString),
    createdAt: attrField<CommonRelationalItemColumns>(
      "created_at",
      GraphQLString,
    ),
    updatedAt: attrField<CommonRelationalItemColumns>(
      "updated_at",
      GraphQLString,
    ),
    isExplicitlyArchived: attrField<CommonRelationalItemColumns>(
      "is_explicitly_archived",
      GraphQLBoolean,
    ),
    archivedAt: attrField<CommonRelationalItemColumns>(
      "archived_at",
      GraphQLString,
    ),
  });

  const RelationalTopic = newObjectTypeBuilder<
    OurGraphQLContext,
    RelationalTopicPlan
  >(PgSelectSinglePlan)({
    name: "RelationalTopic",
    interfaces: [RelationalItem],
    fields: () => ({
      ...commonRelationalItemFields(),
      title: attrField("title", GraphQLString),
    }),
  });

  const RelationalPost = newObjectTypeBuilder<
    OurGraphQLContext,
    RelationalPostPlan
  >(PgSelectSinglePlan)({
    name: "RelationalPost",
    interfaces: [RelationalItem, RelationalCommentable],
    fields: () => ({
      ...commonRelationalItemFields(),
      title: attrField("title", GraphQLString),
      description: attrField("description", GraphQLString),
      note: attrField("note", GraphQLString),

      titleLower: {
        type: GraphQLString,
        plan: EXPORTABLE(
          (pgSelect, scalarTextSource, sql) =>
            function plan($entity) {
              return pgSelect({
                source: scalarTextSource,
                identifiers: [],
                args: [
                  {
                    plan: $entity.record(),
                  },
                ],
                from: (...args: SQL[]) =>
                  sql`interfaces_and_unions.relational_posts_title_lower(${sql.join(
                    args,
                    ", ",
                  )})`,
                name: "relational_posts_title_lower",
              }).single();
            },
          [pgSelect, scalarTextSource, sql],
        ),
      },
    }),
  });

  const RelationalDivider = newObjectTypeBuilder<
    OurGraphQLContext,
    RelationalDividerPlan
  >(PgSelectSinglePlan)({
    name: "RelationalDivider",
    interfaces: [RelationalItem],
    fields: () => ({
      ...commonRelationalItemFields(),
      title: attrField("title", GraphQLString),
      color: attrField("color", GraphQLString),
    }),
  });

  const RelationalChecklist = newObjectTypeBuilder<
    OurGraphQLContext,
    RelationalChecklistPlan
  >(PgSelectSinglePlan)({
    name: "RelationalChecklist",
    interfaces: [RelationalItem, RelationalCommentable],
    fields: () => ({
      ...commonRelationalItemFields(),
      title: attrField("title", GraphQLString),
    }),
  });

  const RelationalChecklistItem = newObjectTypeBuilder<
    OurGraphQLContext,
    RelationalChecklistItemPlan
  >(PgSelectSinglePlan)({
    name: "RelationalChecklistItem",
    interfaces: [RelationalItem, RelationalCommentable],
    fields: () => ({
      ...commonRelationalItemFields(),
      description: attrField("description", GraphQLString),
      note: attrField("note", GraphQLString),
    }),
  });

  ////////////////////////////////////////

  const UnionItem: GraphQLUnionType = new GraphQLUnionType({
    name: "UnionItem",
    resolveType,
    types: () => [
      UnionTopic,
      UnionPost,
      UnionDivider,
      UnionChecklist,
      UnionChecklistItem,
    ],
  });

  const UnionTopic = newObjectTypeBuilder<OurGraphQLContext, UnionTopicPlan>(
    PgSelectSinglePlan,
  )({
    name: "UnionTopic",
    fields: () => ({
      id: attrField("id", GraphQLInt),
      title: attrField("title", GraphQLString),
    }),
  });

  const UnionPost = newObjectTypeBuilder<OurGraphQLContext, UnionPostPlan>(
    PgSelectSinglePlan,
  )({
    name: "UnionPost",
    fields: () => ({
      id: attrField("id", GraphQLInt),
      title: attrField("title", GraphQLString),
      description: attrField("description", GraphQLString),
      note: attrField("note", GraphQLString),
    }),
  });

  const UnionDivider = newObjectTypeBuilder<
    OurGraphQLContext,
    UnionDividerPlan
  >(PgSelectSinglePlan)({
    name: "UnionDivider",
    fields: () => ({
      id: attrField("id", GraphQLInt),
      title: attrField("title", GraphQLString),
      color: attrField("color", GraphQLString),
    }),
  });

  const UnionChecklist = newObjectTypeBuilder<
    OurGraphQLContext,
    UnionChecklistPlan
  >(PgSelectSinglePlan)({
    name: "UnionChecklist",
    fields: () => ({
      id: attrField("id", GraphQLInt),
      title: attrField("title", GraphQLString),
    }),
  });

  const UnionChecklistItem = newObjectTypeBuilder<
    OurGraphQLContext,
    UnionChecklistItemPlan
  >(PgSelectSinglePlan)({
    name: "UnionChecklistItem",
    fields: () => ({
      id: attrField("id", GraphQLInt),
      description: attrField("description", GraphQLString),
      note: attrField("note", GraphQLString),
    }),
  });

  ////////////////////////////////////////

  const Entity: GraphQLUnionType = new GraphQLUnionType({
    name: "Entity",
    resolveType,
    types: () => [Person, Post, Comment],
  });

  ////////////////////////////////////////

  const Query = newObjectTypeBuilder<
    OurGraphQLContext,
    __ValuePlan<BaseGraphQLRootValue>
  >(__ValuePlan)({
    name: "Query",
    fields: {
      forums: {
        type: new GraphQLList(Forum),
        plan: EXPORTABLE(
          (deoptimizeIfAppropriate, forumSource) =>
            function plan(_$root) {
              const $forums = forumSource.find();
              deoptimizeIfAppropriate($forums);
              return $forums;
            },
          [deoptimizeIfAppropriate, forumSource],
        ),
        args: {
          first: {
            type: GraphQLInt,
            plan: EXPORTABLE(
              () =>
                function plan(
                  _$root,
                  $forums: PgSelectPlanFromSource<typeof forumSource>,
                  $value,
                ) {
                  $forums.setFirst($value);
                  return null;
                },
              [],
            ),
          },
          includeArchived: makeIncludeArchivedField<
            PgSelectPlanFromSource<typeof forumSource>
          >(($forums) => $forums),
          condition: {
            type: ForumCondition,
            plan: EXPORTABLE(
              () =>
                function plan(
                  _$root,
                  $forums: PgSelectPlanFromSource<typeof forumSource>,
                ) {
                  return $forums.wherePlan();
                },
              [],
            ),
          },
          filter: {
            type: ForumFilter,
            plan: EXPORTABLE(
              (ClassFilterPlan) =>
                function plan(
                  _$root,
                  $forums: PgSelectPlanFromSource<typeof forumSource>,
                ) {
                  return new ClassFilterPlan(
                    $forums.wherePlan(),
                    $forums.alias,
                  );
                },
              [ClassFilterPlan],
            ),
          },
        },
      },
      forum: {
        type: Forum,
        plan: EXPORTABLE(
          (deoptimizeIfAppropriate, forumSource) =>
            function plan(_$root, args) {
              const $forum = forumSource.get({ id: args.id });
              deoptimizeIfAppropriate($forum);
              return $forum;
            },
          [deoptimizeIfAppropriate, forumSource],
        ),
        args: {
          id: {
            type: new GraphQLNonNull(GraphQLString),
          },
        },
      },
      message: {
        type: Message,
        plan: EXPORTABLE(
          (deoptimizeIfAppropriate, messageSource) =>
            function plan(_$root, args) {
              const $message = messageSource.get({ id: args.id });
              deoptimizeIfAppropriate($message);
              return $message;
            },
          [deoptimizeIfAppropriate, messageSource],
        ),
        args: {
          id: {
            type: new GraphQLNonNull(GraphQLString),
          },
        },
      },
      allMessagesConnection: {
        type: MessagesConnection,
        args: {
          condition: {
            type: MessageCondition,
            plan: EXPORTABLE(
              () =>
                function plan(
                  _$root,
                  $connection: PgConnectionPlanFromSource<typeof messageSource>,
                ) {
                  const $messages = $connection.getSubplan();
                  return $messages.wherePlan();
                },
              [],
            ),
          },
          filter: {
            type: MessageFilter,
            plan: EXPORTABLE(
              (ClassFilterPlan) =>
                function plan(
                  _$root,
                  $connection: PgConnectionPlanFromSource<typeof messageSource>,
                ) {
                  const $messages = $connection.getSubplan();
                  return new ClassFilterPlan(
                    $messages.wherePlan(),
                    $messages.alias,
                  );
                },
              [ClassFilterPlan],
            ),
          },
          includeArchived: makeIncludeArchivedField<
            PgConnectionPlanFromSource<typeof messageSource>
          >(($connection) => $connection.getSubplan()),
          first: {
            type: GraphQLInt,
            plan: EXPORTABLE(
              () =>
                function plan(
                  _$root,
                  $connection: PgConnectionPlanFromSource<typeof messageSource>,
                  $value,
                ) {
                  $connection.setFirst($value);
                  return null;
                },
              [],
            ),
          },
          last: {
            type: GraphQLInt,
            plan: EXPORTABLE(
              () =>
                function plan(
                  _$root,
                  $connection: PgConnectionPlanFromSource<typeof messageSource>,
                  $value,
                ) {
                  $connection.setLast($value);
                  return null;
                },
              [],
            ),
          },
          after: {
            type: GraphQLString,
            plan: EXPORTABLE(
              () =>
                function plan(
                  _$root,
                  $connection: PgConnectionPlanFromSource<typeof messageSource>,
                  $value,
                ) {
                  $connection.setAfter($value);
                  return null;
                },
              [],
            ),
          },
          before: {
            type: GraphQLString,
            plan: EXPORTABLE(
              () =>
                function plan(
                  _$root,
                  $connection: PgConnectionPlanFromSource<typeof messageSource>,
                  $value,
                ) {
                  $connection.setBefore($value);
                  return null;
                },
              [],
            ),
          },
          orderBy: {
            type: new GraphQLList(new GraphQLNonNull(MessagesOrderBy)),
            plan: EXPORTABLE(
              (MessagesOrderBy, getEnumValueConfig, inspect) =>
                function plan(
                  _$root,
                  $connection: PgConnectionPlanFromSource<typeof messageSource>,
                  $value,
                ) {
                  const $messages = $connection.getSubplan();
                  const val = $value.eval();
                  if (!Array.isArray(val)) {
                    throw new Error("Invalid!");
                  }
                  val.forEach((order) => {
                    const config = getEnumValueConfig(MessagesOrderBy, order);
                    const plan = config?.extensions?.graphile?.plan;
                    if (typeof plan !== "function") {
                      console.error(
                        `Internal server error: invalid orderBy configuration: expected function, but received ${inspect(
                          plan,
                        )}`,
                      );
                      throw new Error(
                        "Internal server error: invalid orderBy configuration",
                      );
                    }
                    plan($messages);
                  });
                  return null;
                },
              [MessagesOrderBy, getEnumValueConfig, inspect],
            ),
          },
        },
        plan: EXPORTABLE(
          (connection, deoptimizeIfAppropriate, messageSource) =>
            function plan() {
              const $messages = messageSource.find();
              deoptimizeIfAppropriate($messages);
              // $messages.leftJoin(...);
              // $messages.innerJoin(...);
              // $messages.relation('fk_messages_author_id')
              // $messages.where(...);
              const $connectionPlan = connection($messages);
              // $connectionPlan.orderBy... ?
              // DEFINITELY NOT $messages.orderBy BECAUSE we don't want that applied to aggregates.
              // DEFINITELY NOT $messages.limit BECAUSE we don't want those limits applied to aggregates or page info.
              return $connectionPlan;
            },
          [connection, deoptimizeIfAppropriate, messageSource],
        ),
      },

      uniqueAuthorCount: {
        type: GraphQLInt,
        args: {
          featured: {
            type: GraphQLBoolean,
          },
        },
        plan: EXPORTABLE(
          (TYPES, deoptimizeIfAppropriate, uniqueAuthorCountSource) =>
            function plan(_$root, args) {
              const $featured = args.featured;
              const $plan = uniqueAuthorCountSource.execute([
                {
                  plan: $featured,
                  pgCodec: TYPES.boolean,
                  name: "featured",
                },
              ]);
              deoptimizeIfAppropriate($plan);
              return $plan;
            },
          [TYPES, deoptimizeIfAppropriate, uniqueAuthorCountSource],
        ),
      },

      forumNames: {
        type: new GraphQLList(GraphQLString),
        plan: EXPORTABLE(
          (pgSelect, scalarTextSource, sql) =>
            function plan(_$root) {
              const $plan = pgSelect({
                source: scalarTextSource,
                identifiers: [],
                from: sql`app_public.forum_names()`,
                name: "forum_names",
              });
              return $plan;
            },
          [pgSelect, scalarTextSource, sql],
        ),
      },

      forumNamesArray: {
        type: new GraphQLList(GraphQLString),
        plan: EXPORTABLE(
          (forumNamesArraySource) =>
            function plan(_$root) {
              return forumNamesArraySource.execute();
            },
          [forumNamesArraySource],
        ),
      },

      forumNamesCasesList: {
        type: new GraphQLList(new GraphQLList(GraphQLString)),
        plan: EXPORTABLE(
          (forumNamesCasesSource) =>
            function plan(_$root) {
              const $plan = forumNamesCasesSource.execute();
              return $plan;
            },
          [forumNamesCasesSource],
        ),
      },

      // TODO
      /*
      forumNamesCasesConnection: {
        type: new GraphQLList(GraphQLString),
        plan: EXPORTABLE(
          (forumNamesArraySource, connection) =>
            function plan(_$root) {
              const $plan = forumNamesArraySource.execute();
              return connection($plan);
            },
          [forumNamesArraySource, connection],
        ),
      },
      */

      FORUM_NAMES: {
        type: new GraphQLList(GraphQLString),
        description: "Like forumNames, only we convert them all to upper case",
        plan: EXPORTABLE(
          (each, lambda, pgSelect, scalarTextSource, sql) =>
            function plan(_$root) {
              const $names = pgSelect({
                source: scalarTextSource,
                identifiers: [],
                from: sql`app_public.forum_names()`,
                name: "forum_names",
              });
              // return lambda($names, (names: string[]) => names.map(name => name.toUpperCase())),
              return each($names, ($name) =>
                lambda($name, (name) => name.toUpperCase()),
              );
            },
          [each, lambda, pgSelect, scalarTextSource, sql],
        ),
      },

      randomUser: {
        type: User,
        plan: EXPORTABLE(
          (deoptimizeIfAppropriate, pgSelect, sql, userSource) =>
            function plan() {
              const $users = pgSelect({
                source: userSource,
                identifiers: [],
                from: sql`app_public.random_user()`,
                name: "random_user",
              });
              deoptimizeIfAppropriate($users);
              return $users.single();
            },
          [deoptimizeIfAppropriate, pgSelect, sql, userSource],
        ),
      },

      randomUserArray: {
        type: new GraphQLList(User),
        plan: EXPORTABLE(
          (deoptimizeIfAppropriate, randomUserArraySource) =>
            function plan() {
              const $select = randomUserArraySource.execute();
              deoptimizeIfAppropriate($select);
              return $select;
            },
          [deoptimizeIfAppropriate, randomUserArraySource],
        ),
      },

      randomUserArraySet: {
        type: new GraphQLList(new GraphQLList(User)),
        plan: EXPORTABLE(
          (deoptimizeIfAppropriate, randomUserArraySetSource) =>
            function plan() {
              const $selectPartitioned = randomUserArraySetSource.execute();
              deoptimizeIfAppropriate($selectPartitioned);
              return $selectPartitioned;
            },
          [deoptimizeIfAppropriate, randomUserArraySetSource],
        ),
      },

      featuredMessages: {
        type: new GraphQLList(Message),
        plan: EXPORTABLE(
          (deoptimizeIfAppropriate, featuredMessages, pgSelect) =>
            function plan() {
              const $messages = pgSelect({
                source: featuredMessages,
                identifiers: [],
              });
              deoptimizeIfAppropriate($messages);
              return $messages;
            },
          [deoptimizeIfAppropriate, featuredMessages, pgSelect],
        ),
      },
      people: {
        type: new GraphQLList(Person),
        plan: EXPORTABLE(
          (deoptimizeIfAppropriate, personSource) =>
            function plan() {
              const $people = personSource.find();
              deoptimizeIfAppropriate($people);
              return $people;
            },
          [deoptimizeIfAppropriate, personSource],
        ),
      },

      singleTableItemById: {
        type: SingleTableItem,
        args: {
          id: {
            type: new GraphQLNonNull(GraphQLInt),
          },
        },
        plan: EXPORTABLE(
          (singleTableItemInterface, singleTableItemsSource) =>
            function plan(_$root, args) {
              const $item: SingleTableItemPlan = singleTableItemsSource.get({
                id: args.id,
              });
              return singleTableItemInterface($item);
            },
          [singleTableItemInterface, singleTableItemsSource],
        ),
      },

      singleTableTopicById: {
        type: SingleTableTopic,
        args: {
          id: {
            type: new GraphQLNonNull(GraphQLInt),
          },
        },
        plan: EXPORTABLE(
          (constant, singleTableItemsSource) =>
            function plan(_$root, args) {
              const $item: SingleTableItemPlan = singleTableItemsSource.get({
                id: args.id,
                type: constant("TOPIC"),
              });
              return $item;
            },
          [constant, singleTableItemsSource],
        ),
      },

      relationalItemById: {
        type: RelationalItem,
        args: {
          id: {
            type: new GraphQLNonNull(GraphQLInt),
          },
        },
        plan: EXPORTABLE(
          (relationalItemInterface, relationalItemsSource) =>
            function plan(_$root, args) {
              const $item: RelationalItemPlan = relationalItemsSource.get({
                id: args.id,
              });
              return relationalItemInterface($item);
            },
          [relationalItemInterface, relationalItemsSource],
        ),
      },

      relationalTopicById: {
        type: RelationalTopic,
        args: {
          id: {
            type: new GraphQLNonNull(GraphQLInt),
          },
        },
        plan: EXPORTABLE(
          (relationalTopicsSource) =>
            function plan(_$root, args) {
              return relationalTopicsSource.get({
                id: args.id,
              });
            },
          [relationalTopicsSource],
        ),
      },

      allRelationalCommentablesList: {
        type: new GraphQLList(new GraphQLNonNull(RelationalCommentable)),
        args: {
          first: {
            type: GraphQLInt,
            plan: EXPORTABLE(
              () =>
                function plan(
                  _$root,
                  $each: __ListTransformPlan<any, any, any, any>,
                  $value,
                ) {
                  const $commentables =
                    $each.getListPlan() as RelationalCommentablesPlan;
                  $commentables.setFirst($value);
                  return null;
                },
              [],
            ),
          },
        },
        plan: EXPORTABLE(
          (
            TYPES,
            each,
            relationalCommentableInterface,
            relationalCommentableSource,
            sql,
          ) =>
            function plan() {
              const $commentables: RelationalCommentablesPlan =
                relationalCommentableSource.find();
              $commentables.orderBy({
                codec: TYPES.int,
                fragment: sql`${$commentables.alias}.id`,
                direction: "ASC",
              });
              return each($commentables, ($commentable) =>
                relationalCommentableInterface($commentable),
              );
            },
          [
            TYPES,
            each,
            relationalCommentableInterface,
            relationalCommentableSource,
            sql,
          ],
        ),
      },

      unionItemById: {
        type: UnionItem,
        args: {
          id: {
            type: new GraphQLNonNull(GraphQLInt),
          },
        },
        plan: EXPORTABLE(
          (unionItemUnion, unionItemsSource) =>
            function plan(_$root, args) {
              const $item: UnionItemPlan = unionItemsSource.get({
                id: args.id,
              });
              return unionItemUnion($item);
            },
          [unionItemUnion, unionItemsSource],
        ),
      },

      unionTopicById: {
        type: UnionTopic,
        args: {
          id: {
            type: new GraphQLNonNull(GraphQLInt),
          },
        },
        plan: EXPORTABLE(
          (unionTopicsSource) =>
            function plan(_$root, args) {
              return unionTopicsSource.get({
                id: args.id,
              });
            },
          [unionTopicsSource],
        ),
      },

      allUnionItemsList: {
        type: new GraphQLList(new GraphQLNonNull(UnionItem)),
        plan: EXPORTABLE(
          (TYPES, each, sql, unionItemUnion, unionItemsSource) =>
            function plan() {
              const $items: UnionItemsPlan = unionItemsSource.find();
              $items.orderBy({
                codec: TYPES.int,
                fragment: sql`${$items.alias}.id`,
                direction: "ASC",
              });
              return each($items, ($item) => unionItemUnion($item));
            },
          [TYPES, each, sql, unionItemUnion, unionItemsSource],
        ),
      },

      searchEntities: {
        type: new GraphQLList(new GraphQLNonNull(Entity)),
        args: {
          query: {
            type: new GraphQLNonNull(GraphQLString),
          },
        },
        plan: EXPORTABLE(
          (
            TYPES,
            deoptimizeIfAppropriate,
            each,
            entitySearchSource,
            entityUnion,
          ) =>
            function plan(_$root, args) {
              const $plan = entitySearchSource.execute([
                {
                  plan: args.query,
                  pgCodec: TYPES.text,
                  name: "query",
                },
              ]) as PgSelectPlan<any, any, any, any>;
              deoptimizeIfAppropriate($plan);
              return each($plan, ($item) => entityUnion($item));
            },
          [
            TYPES,
            deoptimizeIfAppropriate,
            each,
            entitySearchSource,
            entityUnion,
          ],
        ),
      },

      personByPersonId: {
        type: Person,
        args: {
          personId: {
            type: new GraphQLNonNull(GraphQLInt),
          },
        },
        plan: EXPORTABLE(
          (personSource) =>
            function plan(_$root, args) {
              return personSource.get({ person_id: args.personId });
            },
          [personSource],
        ),
      },
    },
  });

  const CreateRelationalPostInput = newInputObjectTypeBuilder()({
    name: "CreateRelationalPostInput",
    fields: {
      title: {
        type: new GraphQLNonNull(GraphQLString),
      },
      description: {
        type: GraphQLString,
      },
      note: {
        type: GraphQLString,
      },
    },
  });

  const RelationalPostPatch = newInputObjectTypeBuilder()({
    name: "RelationalPostPatch",
    fields: {
      // All nullable, since it's a patch.
      title: {
        type: GraphQLString,
      },
      description: {
        type: GraphQLString,
      },
      note: {
        type: GraphQLString,
      },
    },
  });

  const UpdateRelationalPostByIdInput = newInputObjectTypeBuilder()({
    name: "UpdateRelationalPostByIdInput",
    fields: {
      id: {
        type: new GraphQLNonNull(GraphQLInt),
      },
      patch: {
        type: new GraphQLNonNull(RelationalPostPatch),
      },
    },
  });

  const DeleteRelationalPostByIdInput = newInputObjectTypeBuilder()({
    name: "DeleteRelationalPostByIdInput",
    fields: {
      id: {
        type: new GraphQLNonNull(GraphQLInt),
      },
    },
  });

  type PgRecord<TDataSource extends PgSource<any, any, any, any>> =
    PgClassExpressionPlan<
      TDataSource["TColumns"],
      PgTypeCodec<TDataSource["TColumns"], any, any>,
      TDataSource["TColumns"],
      TDataSource["TUniques"],
      TDataSource["TRelations"],
      TDataSource["TParameters"]
    >;

  const CreateRelationalPostPayload = newObjectTypeBuilder<
    OurGraphQLContext,
    PgRecord<typeof relationalPostsSource>
  >(PgClassExpressionPlan)({
    name: "CreateRelationalPostPayload",
    fields: {
      post: {
        type: RelationalPost,
        plan: EXPORTABLE(
          (relationalPostsSource) =>
            function plan($post) {
              return relationalPostsSource.get({ id: $post.get("id") });
            },
          [relationalPostsSource],
        ),
      },
      id: {
        type: GraphQLInt,
        plan: EXPORTABLE(
          () =>
            function plan($post) {
              return $post.get("id");
            },
          [],
        ),
      },
      query: {
        type: Query,
        plan: EXPORTABLE(
          (aether) =>
            function plan() {
              return aether().rootValuePlan;
            },
          [aether],
        ),
      },
    },
  });

  const UpdateRelationalPostByIdPayload = newObjectTypeBuilder<
    OurGraphQLContext,
    PgUpdatePlanFromSource<typeof relationalPostsSource>
  >(PgUpdatePlan)({
    name: "UpdateRelationalPostByIdPayload",
    fields: {
      post: {
        type: RelationalPost,
        plan: EXPORTABLE(
          (relationalPostsSource) =>
            function plan($post) {
              return relationalPostsSource.get({ id: $post.get("id") });
            },
          [relationalPostsSource],
        ),
      },
      id: {
        type: GraphQLInt,
        plan: EXPORTABLE(
          () =>
            function plan($post) {
              return $post.get("id");
            },
          [],
        ),
      },
      query: {
        type: Query,
        plan: EXPORTABLE(
          (aether) =>
            function plan() {
              return aether().rootValuePlan;
            },
          [aether],
        ),
      },
    },
  });

  const DeleteRelationalPostByIdPayload = newObjectTypeBuilder<
    OurGraphQLContext,
    PgDeletePlanFromSource<typeof relationalPostsSource>
  >(PgDeletePlan)({
    name: "DeleteRelationalPostByIdPayload",
    fields: {
      // Since we've deleted the post we cannot go and fetch it; so we must
      // return the record from the mutation RETURNING clause
      post: {
        type: RelationalPost,
        plan: EXPORTABLE(
          (pgSelectSingleFromRecord, relationalPostsSource) =>
            function plan($post) {
              return pgSelectSingleFromRecord(
                relationalPostsSource,
                $post.record(),
              );
            },
          [pgSelectSingleFromRecord, relationalPostsSource],
        ),
      },

      id: {
        type: GraphQLInt,
        plan: EXPORTABLE(
          () =>
            function plan($post) {
              return $post.get("id");
            },
          [],
        ),
      },
      query: {
        type: Query,
        plan: EXPORTABLE(
          (aether) =>
            function plan() {
              return aether().rootValuePlan;
            },
          [aether],
        ),
      },
    },
  });

  const Mutation = newObjectTypeBuilder<
    OurGraphQLContext,
    __ValuePlan<BaseGraphQLRootValue>
  >(__ValuePlan)({
    name: "Mutation",
    fields: {
      createRelationalPost: {
        args: {
          input: {
            type: new GraphQLNonNull(CreateRelationalPostInput),
          },
        },
        type: CreateRelationalPostPayload,
        plan: EXPORTABLE(
          (constant, pgInsert, relationalItemsSource, relationalPostsSource) =>
            function plan(_$root, args) {
              const $item = pgInsert(relationalItemsSource, {
                type: constant`POST`,
                author_id: constant(2),
              });
              const $itemId = $item.get("id");
              // TODO: make this TypeScript stuff automatic
              const $input = args.input as __InputObjectPlan;
              const $post = pgInsert(relationalPostsSource, {
                id: $itemId,
              });
              for (const key of ["title", "description", "note"] as Array<
                keyof typeof relationalPostsSource.codec.columns
              >) {
                const $value = $input.get(key);
                if (!$value.evalIs(undefined)) {
                  $post.set(key, $value);
                }
              }

              // NOTE: returning a record() here is unnecessary and requires
              // `select *` privileges. In a normal schema we'd just return the
              // mutation plan directly. Even if we're sharing types it would
              // generally be better to return the identifier and then look up the
              // record using the identifier. Nonetheless, this is useful for tests.

              // Since our field type, `CreateRelationalPostPayload`, is shared between
              // `createRelationalPost`, `createThreeRelationalPosts` and
              // `createThreeRelationalPostsComputed` must return a common plan
              // type that `CreateRelationalPostPayload` can use; in this case a
              // `PgClassExpressionPlan`
              return $post.record();
            },
          [constant, pgInsert, relationalItemsSource, relationalPostsSource],
        ),
      },

      createThreeRelationalPosts: {
        description:
          "This silly mutation is specifically to ensure that mutation plans are not tree-shaken - we never want to throw away mutation side effects.",
        type: CreateRelationalPostPayload,
        plan: EXPORTABLE(
          (constant, pgInsert, relationalItemsSource, relationalPostsSource) =>
            function plan() {
              // Only the _last_ post plan is returned; there's no dependency on
              // the first two posts, and yet they should not be tree-shaken
              // because they're mutations.
              let $post: PgInsertPlanFromSource<typeof relationalPostsSource>;
              for (let i = 0; i < 3; i++) {
                const $item = pgInsert(relationalItemsSource, {
                  type: constant`POST`,
                  author_id: constant(2),
                });
                const $itemId = $item.get("id");
                $post = pgInsert(relationalPostsSource, {
                  id: $itemId,
                  title: constant(`Post #${i + 1}`),
                  description: constant(`Desc ${i + 1}`),
                  note: constant(null),
                });
              }

              // See NOTE in createRelationalPost plan.
              return $post!.record();
            },
          [constant, pgInsert, relationalItemsSource, relationalPostsSource],
        ),
      },

      createThreeRelationalPostsComputed: {
        description:
          "This silly mutation is specifically to ensure that mutation plans are not tree-shaken even if they use plans that are normally side-effect free - we never want to throw away mutation side effects.",
        type: CreateRelationalPostPayload,
        plan: EXPORTABLE(
          (TYPES, constant, pgSelect, relationalPostsSource, sql) =>
            function plan() {
              // Only the _last_ post plan is returned; there's no dependency on
              // the first two posts, and yet they should not be tree-shaken
              // because they're mutations.
              let $post: PgSelectPlanFromSource<typeof relationalPostsSource>;
              for (let i = 0; i < 3; i++) {
                $post = pgSelect({
                  source: relationalPostsSource,
                  identifiers: [],
                  from: (authorId, title) =>
                    sql`interfaces_and_unions.insert_post(${authorId}, ${title})`,
                  args: [
                    {
                      plan: constant(2),
                      pgCodec: TYPES.int,
                    },
                    {
                      plan: constant(`Computed post #${i + 1}`),
                      pgCodec: TYPES.text,
                    },
                  ],
                });
                $post.hasSideEffects = true;
              }

              // See NOTE in createRelationalPost plan.
              return $post!.single().record();
            },
          [TYPES, constant, pgSelect, relationalPostsSource, sql],
        ),
      },

      updateRelationalPostById: {
        args: {
          input: {
            type: new GraphQLNonNull(UpdateRelationalPostByIdInput),
          },
        },
        type: UpdateRelationalPostByIdPayload,
        plan: EXPORTABLE(
          (pgUpdate, relationalPostsSource) =>
            function plan(_$root, args) {
              const $input = args.input as __InputObjectPlan;
              const $patch = $input.get("patch") as __InputObjectPlan;
              const $post = pgUpdate(relationalPostsSource, {
                id: $input.get("id"),
              });
              for (const key of ["title", "description", "note"] as Array<
                keyof typeof relationalPostsSource.codec.columns
              >) {
                const $value = $patch.get(key);
                // TODO: test that we differentiate between value set to null and
                // value not being present
                if (!$value.evalIs(undefined)) {
                  $post.set(key, $value);
                }
              }
              return $post;
            },
          [pgUpdate, relationalPostsSource],
        ),
      },

      deleteRelationalPostById: {
        args: {
          input: {
            type: new GraphQLNonNull(DeleteRelationalPostByIdInput),
          },
        },
        type: DeleteRelationalPostByIdPayload,
        plan: EXPORTABLE(
          (pgDelete, relationalPostsSource) =>
            function plan(_$root, args) {
              const $input = args.input as __InputObjectPlan;
              const $post = pgDelete(relationalPostsSource, {
                id: $input.get("id"),
              });
              return $post;
            },
          [pgDelete, relationalPostsSource],
        ),
      },
    },
  });

  const ForumMessageSubscriptionPayload = newObjectTypeBuilder<
    OurGraphQLContext,
    JSONParsePlan<{ id: string; op: string }>
  >(JSONParsePlan)({
    name: "ForumMessageSubscriptionPayload",
    fields: {
      operationType: {
        type: GraphQLString,
        plan: EXPORTABLE(
          (lambda) =>
            function plan($event) {
              return lambda($event.get("op"), (txt) =>
                String(txt).toLowerCase(),
              );
            },
          [lambda],
        ),
      },
      message: {
        type: Message,
        plan: EXPORTABLE(
          (messageSource) =>
            function plan($event) {
              return messageSource.get({ id: $event.get("id") });
            },
          [messageSource],
        ),
      },
    },
  });

  const Subscription = newObjectTypeBuilder<
    OurGraphQLContext,
    __ValuePlan<BaseGraphQLRootValue>
  >(__ValuePlan)({
    name: "Subscription",
    fields: {
      forumMessage: {
        args: {
          forumId: {
            type: new GraphQLNonNull(GraphQLString),
          },
        },
        type: ForumMessageSubscriptionPayload,
        subscribePlan: EXPORTABLE(
          (context, jsonParse, lambda, listen) =>
            function subscribePlan(_$root, args) {
              const $forumId = args.forumId as __InputStaticLeafPlan<number>;
              const $topic = lambda($forumId, (id) => `forum:${id}:message`);
              const $pgSubscriber = context<OurGraphQLContext>().get(
                "pgSubscriber",
              ) as AccessPlan<CrystalSubscriber>;

              return listen($pgSubscriber, $topic, jsonParse);
            },
          [context, jsonParse, lambda, listen],
        ),
        plan: EXPORTABLE(
          () =>
            function plan($event) {
              return $event;
            },
          [],
        ),
      },
    },
  });

  return dataplannerEnforce(
    new GraphQLSchema({
      query: Query,
      mutation: Mutation,
      subscription: Subscription,
      types: [
        // Don't forget to add all types that implement interfaces here
        // otherwise they _might_ not show up in the schema.

        SingleTableTopic,
        SingleTablePost,
        SingleTableDivider,
        SingleTableChecklist,
        SingleTableChecklistItem,

        RelationalTopic,
        RelationalPost,
        RelationalDivider,
        RelationalChecklist,
        RelationalChecklistItem,
      ],
      extensions: {
        graphileExporter: {
          deps: [
            relationalDividersSource,
            relationalChecklistsSource,
            relationalChecklistItemsSource,
          ],
        },
      },
      enableDeferStream: true,
    }),
  );
}

async function main() {
  const filePath = `${__dirname}/schema.graphql`;
  const schema = makeExampleSchema();
  writeFileSync(
    filePath,
    //prettier.format(
    printSchema(schema),
    //{
    //  ...(await prettier.resolveConfig(filePath)),
    //  parser: "graphql",
    //}),
  );
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
