import chalk from "chalk";
import debugFactory from "debug";

import { crystalPrint, crystalPrintPathIdentity } from "./crystalPrint";
import { exportAsMany } from "./exportAs";
import {
  CrystalPlans,
  EnumPlans,
  FieldPlans,
  InputObjectPlans,
  InterfaceOrUnionPlans,
  makeCrystalSchema,
  ObjectPlans,
  ScalarPlans,
} from "./makeCrystalSchema";
import { PrintPlanGraphOptions } from "./mermaid";

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
  BaseEventMap,
  BaseGraphQLArguments,
  BaseGraphQLContext,
  BaseGraphQLRootValue,
  BaseGraphQLVariables,
  CrystalResultsList,
  CrystalResultStreamList,
  CrystalSubscriber,
  CrystalValuesList,
  EventCallback,
  EventMapKey,
  ExecutionEventEmitter,
  ExecutionEventMap,
  ExecutionExtra,
  FieldPlanResolver,
  GraphileArgumentConfig,
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
  ScalarPlanResolver,
  EnumPlanResolver,
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
  __ItemPlan,
  __ListTransformPlan,
  __TrackedObjectPlan,
  __ValuePlan,
  access,
  AccessPlan,
  ActualKeyByDesiredKey,
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
  first,
  FirstPlan,
  groupBy,
  GroupByPlanMemo,
  lambda,
  LambdaPlan,
  last,
  LastPlan,
  list,
  listen,
  ListenPlan,
  ListPlan,
  listTransform,
  ListTransformItemPlanCallback,
  ListTransformOptions,
  ListTransformReduce,
  makeMapper,
  map,
  MapPlan,
  node,
  NodePlan,
  object,
  ObjectPlan,
  ObjectPlanMeta,
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
  CrystalWrapDetails,
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
  ObjectTypeFields,
  ObjectTypeSpec,
  planGroupsOverlap,
} from "./utils";

export { isAsyncIterable } from "iterall";
export {
  __InputListPlan,
  __InputObjectPlan,
  __InputStaticLeafPlan,
  __ItemPlan,
  __ListTransformPlan,
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
  ActualKeyByDesiredKey,
  Aether,
  aether,
  ArgumentPlanResolver,
  arraysMatch,
  assertListCapablePlan,
  BaseEventMap,
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
  CrystalPlans,
  crystalPrint,
  crystalPrintPathIdentity,
  crystalResolve,
  CrystalResultsList,
  CrystalResultStreamList,
  CrystalSubscriber,
  CrystalValuesList,
  CrystalWrapDetails,
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
  EnumPlans,
  EventCallback,
  EventMapKey,
  ExecutablePlan,
  execute,
  ExecutionEventEmitter,
  ExecutionEventMap,
  ExecutionExtra,
  FieldPlanResolver,
  FieldPlans,
  filter,
  FilterPlanMemo,
  first,
  FirstPlan,
  getCurrentParentPathIdentity,
  getEnumValueConfig,
  GraphileArgumentConfig,
  GraphileFieldConfig,
  GraphileFieldConfigArgumentMap,
  GraphileInputFieldConfig,
  GraphileInputFieldConfigMap,
  GraphileInputObjectType,
  GraphileObjectType,
  groupBy,
  GroupByPlanMemo,
  InputObjectFieldPlanResolver,
  inputObjectFieldSpec,
  InputObjectPlans,
  InputObjectTypeSpec,
  InputPlan,
  InterfaceOrUnionPlans,
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
  ListTransformItemPlanCallback,
  ListTransformOptions,
  ListTransformReduce,
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
  ObjectPlanMeta,
  ObjectPlans,
  objectSpec,
  ObjectTypeFields,
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
  PrintPlanGraphOptions,
  PromiseOrDirect,
  resolveType,
  reverse,
  reverseArray,
  ReversePlan,
  ROOT_PATH,
  ScalarPlans,
  StreamablePlan,
  stripAnsi,
  subscribe,
  TrackedArguments,
  TypedEventEmitter,
  ScalarPlanResolver,
  EnumPlanResolver,
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
