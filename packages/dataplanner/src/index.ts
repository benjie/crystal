import chalk from "chalk";
import debugFactory from "debug";

import { crystalPrint, crystalPrintPathIdentity } from "./crystalPrint";
import { exportAsMany } from "./exportAs";
import { makeCrystalSchema } from "./makeCrystalSchema";

// TODO: doing this here feels "naughty".
debugFactory.formatters.c = crystalPrint;
debugFactory.formatters.p = (pathIdentity) =>
  chalk.bold.yellow(crystalPrintPathIdentity(pathIdentity));

import { Aether } from "./aether";
import { ROOT_PATH } from "./constants";
import { dataplannerEnforce } from "./dataplannerEnforce";
import { defer, Deferred } from "./deferred";
// Handy for debugging
import { isDev, noop } from "./dev";
import { CrystalError, isCrystalError } from "./error";
import { DataPlannerExecuteOptions, execute } from "./execute";
import { getCurrentParentPathIdentity } from "./global";
import { InputPlan } from "./input";
import {
  $$bypassGraphQL,
  $$data,
  $$eventEmitter,
  $$idempotent,
  $$verbatim,
  ArgumentPlanResolver,
  BaseGraphQLArguments,
  BaseGraphQLContext,
  BaseGraphQLRootValue,
  BaseGraphQLVariables,
  CrystalResultsList,
  CrystalResultStreamList,
  CrystalSubscriber,
  CrystalValuesList,
  ExecutionEventEmitter,
  ExecutionEventMap,
  ExecutionExtra,
  FieldPlanResolver,
  GraphileFieldConfig,
  GraphileFieldConfigArgumentMap,
  GraphileInputFieldConfig,
  InputObjectFieldPlanResolver,
  NodeIdCodec,
  NodeIdHandler,
  OutputPlanForType,
  PlanOptimizeOptions,
  PlanStreamOptions,
  PolymorphicData,
  PromiseOrDirect,
  TrackedArguments,
  TypedEventEmitter,
  BaseEventMap,
  EventMapKey,
  EventCallback,
  GraphileArgumentConfig,
} from "./interfaces";
import {
  assertListCapablePlan,
  BasePlan,
  ExecutablePlan,
  isExecutablePlan,
  isListCapablePlan,
  isModifierPlan,
  isObjectLikePlan,
  isStreamablePlan,
  ListCapablePlan,
  ModifierPlan,
  ObjectLikePlan,
  PolymorphicPlan,
  StreamablePlan,
} from "./plan";
import {
  __InputObjectPlan,
  __InputStaticLeafPlan,
  ActualKeyByDesiredKey,
  __ItemPlan,
  __ListTransformPlan,
  ListTransformItemPlanCallback,
  ListTransformOptions,
  ListTransformReduce,
  __TrackedObjectPlan,
  __ValuePlan,
  access,
  AccessPlan,
  aether,
  connection,
  ConnectionCapablePlan,
  ConnectionPlan,
  constant,
  ConstantPlan,
  context,
  debugPlans,
  each,
  EdgeCapablePlan,
  EdgePlan,
  filter,
  FilterPlanMemo,
  GroupByPlanMemo,
  first,
  FirstPlan,
  groupBy,
  lambda,
  LambdaPlan,
  last,
  LastPlan,
  list,
  listen,
  ListenPlan,
  ListPlan,
  listTransform,
  makeMapper,
  map,
  MapPlan,
  node,
  NodePlan,
  object,
  ObjectPlan,
  PageInfoCapablePlan,
  partitionByIndex,
  reverse,
  reverseArray,
  ReversePlan,
} from "./plans";
import { __InputListPlan } from "./plans/__inputList";
import { polymorphicWrap, resolveType } from "./polymorphic";
import {
  $$crystalWrapped,
  crystalResolve,
  dataplannerResolver,
  dataplannerSubscriber,
  isCrystalWrapped,
} from "./resolvers";
import { stripAnsi } from "./stripAnsi";
import { subscribe } from "./subscribe";
import {
  arraysMatch,
  getEnumValueConfig,
  GraphileInputFieldConfigMap,
  GraphileInputObjectType,
  GraphileObjectType,
  inputObjectFieldSpec,
  InputObjectTypeSpec,
  isPromiseLike,
  newGraphileFieldConfigBuilder,
  newInputObjectTypeBuilder,
  newObjectTypeBuilder,
  objectFieldSpec,
  objectSpec,
  ObjectTypeSpec,
  planGroupsOverlap,
  ObjectTypeFields,
} from "./utils";

export { isAsyncIterable } from "iterall";
export {
  BaseEventMap,
  EventMapKey,
  EventCallback,
  ObjectTypeFields,
  __InputListPlan,
  __InputObjectPlan,
  __InputStaticLeafPlan,
  ActualKeyByDesiredKey,
  __ItemPlan,
  __ListTransformPlan,
  GraphileArgumentConfig,
  ListTransformItemPlanCallback,
  ListTransformOptions,
  ListTransformReduce,
  __TrackedObjectPlan,
  __ValuePlan,
  $$bypassGraphQL,
  $$crystalWrapped,
  $$data,
  $$eventEmitter,
  $$idempotent,
  $$verbatim,
  access,
  AccessPlan,
  Aether,
  aether,
  ArgumentPlanResolver,
  arraysMatch,
  assertListCapablePlan,
  BaseGraphQLArguments,
  BaseGraphQLContext,
  BaseGraphQLRootValue,
  BaseGraphQLVariables,
  BasePlan,
  connection,
  ConnectionCapablePlan,
  ConnectionPlan,
  constant,
  ConstantPlan,
  context,
  CrystalError,
  crystalPrint,
  crystalPrintPathIdentity,
  crystalResolve,
  CrystalResultsList,
  CrystalResultStreamList,
  CrystalSubscriber,
  CrystalValuesList,
  dataplannerEnforce,
  DataPlannerExecuteOptions,
  dataplannerResolver,
  dataplannerSubscriber,
  debugPlans,
  defer,
  Deferred,
  each,
  EdgeCapablePlan,
  EdgePlan,
  ExecutablePlan,
  execute,
  ExecutionEventEmitter,
  ExecutionEventMap,
  ExecutionExtra,
  FieldPlanResolver,
  filter,
  FilterPlanMemo,
  GroupByPlanMemo,
  first,
  FirstPlan,
  getCurrentParentPathIdentity,
  getEnumValueConfig,
  GraphileFieldConfig,
  GraphileFieldConfigArgumentMap,
  GraphileInputFieldConfig,
  GraphileInputFieldConfigMap,
  GraphileInputObjectType,
  GraphileObjectType,
  groupBy,
  InputObjectFieldPlanResolver,
  inputObjectFieldSpec,
  InputObjectTypeSpec,
  InputPlan,
  isCrystalError,
  isCrystalWrapped,
  isDev,
  isExecutablePlan,
  isListCapablePlan,
  isModifierPlan,
  isObjectLikePlan,
  isPromiseLike,
  isStreamablePlan,
  lambda,
  LambdaPlan,
  last,
  LastPlan,
  list,
  ListCapablePlan,
  listen,
  ListenPlan,
  ListPlan,
  listTransform,
  makeCrystalSchema,
  makeMapper,
  map,
  MapPlan,
  ModifierPlan,
  newGraphileFieldConfigBuilder,
  newInputObjectTypeBuilder,
  newObjectTypeBuilder,
  node,
  NodeIdCodec,
  NodeIdHandler,
  NodePlan,
  noop,
  object,
  objectFieldSpec,
  ObjectLikePlan,
  ObjectPlan,
  objectSpec,
  ObjectTypeSpec,
  OutputPlanForType,
  PageInfoCapablePlan,
  partitionByIndex,
  planGroupsOverlap,
  PlanOptimizeOptions,
  PlanStreamOptions,
  PolymorphicData,
  PolymorphicPlan,
  polymorphicWrap,
  PromiseOrDirect,
  resolveType,
  reverse,
  reverseArray,
  ReversePlan,
  ROOT_PATH,
  StreamablePlan,
  stripAnsi,
  subscribe,
  TrackedArguments,
  TypedEventEmitter,
};

exportAsMany({
  crystalPrint,
  crystalPrintPathIdentity,
  makeCrystalSchema,
  Aether,
  ROOT_PATH,
  defer,
  dataplannerEnforce,
  execute,
  subscribe,
  __InputListPlan,
  __InputObjectPlan,
  __InputStaticLeafPlan,
  assertListCapablePlan,
  isExecutablePlan,
  isListCapablePlan,
  isModifierPlan,
  isObjectLikePlan,
  isStreamablePlan,
  __ItemPlan,
  __ListTransformPlan,
  __TrackedObjectPlan,
  __ValuePlan,
  access,
  AccessPlan,
  aether,
  connection,
  ConnectionPlan,
  constant,
  ConstantPlan,
  context,
  isCrystalError,
  debugPlans,
  each,
  groupBy,
  filter,
  partitionByIndex,
  listTransform,
  first,
  node,
  NodePlan,
  FirstPlan,
  last,
  LastPlan,
  lambda,
  LambdaPlan,
  list,
  ListPlan,
  makeMapper,
  map,
  MapPlan,
  object,
  ObjectPlan,
  reverse,
  reverseArray,
  ReversePlan,
  listen,
  ListenPlan,
  polymorphicWrap,
  resolveType,
  $$crystalWrapped,
  isCrystalWrapped,
  dataplannerResolver,
  crystalResolve,
  dataplannerSubscriber,
  stripAnsi,
  arraysMatch,
  inputObjectFieldSpec,
  newGraphileFieldConfigBuilder,
  newInputObjectTypeBuilder,
  newObjectTypeBuilder,
  objectFieldSpec,
  objectSpec,
  planGroupsOverlap,
  isPromiseLike,
  isDev,
  noop,
  getCurrentParentPathIdentity,
  getEnumValueConfig,
});
