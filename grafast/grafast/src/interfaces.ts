import type EventEmitter from "eventemitter3";
import type { PluginHook } from "graphile-config";
import type {
  ASTNode,
  ExecutionArgs,
  GraphQLArgument,
  GraphQLArgumentConfig,
  GraphQLField,
  GraphQLFieldConfig,
  GraphQLInputField,
  GraphQLInputFieldConfig,
  GraphQLInputObjectType,
  GraphQLInputType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLOutputType,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLType,
} from "graphql";

import type { Bucket, RequestContext } from "./bucket.js";
import type { GrafastError } from "./error.js";
import type { InputStep } from "./input.js";
import type { ExecutableStep, ListCapableStep, ModifierStep } from "./step.js";
import type { __InputDynamicScalarStep } from "./steps/__inputDynamicScalar.js";
import type {
  __InputListStep,
  __InputObjectStep,
  __InputStaticLeafStep,
  __TrackedObjectStep,
} from "./steps/index.js";
import type { GraphileInputObjectType, GraphileObjectType } from "./utils.js";

type PromiseOrValue<T> = T | Promise<T>;

export interface GrafastOptions {
  // TODO: context should be a generic
  /**
   * An object to merge into the GraphQL context. Alternatively, pass an
   * (optionally asynchronous) function that returns an object to merge into
   * the GraphQL context.
   */
  context?:
    | Record<string, any>
    | (<TContext extends Record<string, any>>(
        ctx: GraphileConfig.GraphQLRequestContext,
        currentContext?: Partial<TContext>,
      ) => PromiseOrValue<Partial<TContext>>);

  /**
   * A list of 'explain' types that should be included in `extensions.explain`.
   *
   * - `mermaid-js` will cause the mermaid plan to be included
   * - other values are dependent on the plugins in play
   *
   * If set to `true` then all possible explain types will be exposed.
   */
  explain?: boolean | string[];
}

declare global {
  namespace GraphileConfig {
    interface GraphQLRequestContext {}
    interface Preset {
      grafast?: GrafastOptions;
    }
    interface GrafastHooks {
      args: PluginHook<
        (event: {
          args: ExecutionArgs;
          ctx: GraphileConfig.GraphQLRequestContext;
          resolvedPreset: GraphileConfig.ResolvedPreset;
        }) => PromiseOrValue<ExecutionArgs>
      >;
    }
    interface Plugin {
      grafast?: {
        hooks?: GrafastHooks;
      };
    }
  }
}

export interface GrafastFieldExtensions {
  plan?: FieldPlanResolver<any, any, any>;
  subscribePlan?: FieldPlanResolver<any, any, any>;
}

export interface GrafastArgumentExtensions {
  // fooPlan?: ArgumentPlanResolver<any, any, any, any, any>;
  inputPlan?: ArgumentInputPlanResolver;
  applyPlan?: ArgumentApplyPlanResolver;
}

export interface GrafastInputObjectTypeExtensions {
  inputPlan?: InputObjectTypeInputPlanResolver;
}

export interface GrafastInputFieldExtensions {
  // fooPlan?: InputObjectFieldPlanResolver<any, any, any, any>;
  inputPlan?: InputObjectFieldInputPlanResolver;
  applyPlan?: InputObjectFieldApplyPlanResolver;
}

export interface GrafastObjectTypeExtensions {
  Step?: { new (...args: any[]): ExecutableStep };
}

export interface GrafastEnumTypeExtensions {}

export interface GrafastEnumValueExtensions {
  /**
   * EXPERIMENTAL!
   *
   * @internal
   */
  applyPlan?: EnumValueApplyPlanResolver<any>;
}

export interface GrafastScalarTypeExtensions {
  plan?: ScalarPlanResolver;
  inputPlan?: ScalarInputPlanResolver;
  /**
   * Set true if `serialize(serialize(foo)) === serialize(foo)` for all foo
   */
  idempotent?: boolean;
}

// TODO: change 'graphile' to 'grafast'

/*
 * We register certain things (plans, etc) into the GraphQL "extensions"
 * property on the various GraphQL configs (type, field, argument, etc); this
 * uses declaration merging so that these can be accessed with types.
 */
declare module "graphql" {
  interface GraphQLFieldExtensions<_TSource, _TContext, _TArgs = any> {
    graphile?: GrafastFieldExtensions;
  }

  interface GraphQLArgumentExtensions {
    graphile?: GrafastArgumentExtensions;
  }

  interface GraphQLInputObjectTypeExtensions {
    graphile?: GrafastInputObjectTypeExtensions;
  }

  interface GraphQLInputFieldExtensions {
    graphile?: GrafastInputFieldExtensions;
  }

  interface GraphQLObjectTypeExtensions<_TSource = any, _TContext = any> {
    graphile?: GrafastObjectTypeExtensions;
  }

  interface GraphQLEnumTypeExtensions {
    graphile?: GrafastEnumTypeExtensions;
  }

  interface GraphQLEnumValueExtensions {
    graphile?: GrafastEnumValueExtensions;
  }

  interface GraphQLScalarTypeExtensions {
    graphile?: GrafastScalarTypeExtensions;
  }
}

export const $$grafastContext = Symbol("context");
export const $$planResults = Symbol("planResults");
export const $$id = Symbol("id");
/** Return the value verbatim, don't execute */
export const $$verbatim = Symbol("verbatim");
/**
 * If we're sure the data is the right shape and valid, we can set this key and
 * it can be returned directly
 */
export const $$bypassGraphQL = Symbol("bypassGraphQL");
export const $$data = Symbol("data");
/**
 * For attaching additional metadata to the GraphQL execution result, for
 * example details of the plan or SQL queries or similar that were executed.
 */
export const $$extensions = Symbol("extensions");

/**
 * The "GraphQLObjectType" type name, useful when dealing with polymorphism.
 *
 * @internal
 */
export const $$concreteType = Symbol("concreteType");

/**
 * Set this key on a type if that type's serialization is idempotent (that is
 * to say `serialize(serialize(thing)) === serialize(thing)`). This means we
 * don't have to "roll-back" serialization if we need to fallback to graphql-js
 * execution.
 */
export const $$idempotent = Symbol("idempotent");

/**
 * The event emitter used for outputting execution events.
 */
export const $$eventEmitter = Symbol("executionEventEmitter");

/**
 * Used to indicate that an array has more results available via a stream.
 */
export const $$streamMore = Symbol("streamMore");

export const $$proxy = Symbol("proxy");

/**
 * When dealing with a polymorphic thing we need to be able to determine what
 * the concrete type of it is, we use the $$concreteType property for that.
 */
export interface PolymorphicData<TType extends string = string, TData = any> {
  [$$concreteType]: TType;
  [$$data]?: TData;
}

export interface IndexByListItemStepId {
  [listItemStepId: number]: number;
}

// These values are just to make reading the code a little clearer
export type GrafastValuesList<T> = ReadonlyArray<T>;
export type PromiseOrDirect<T> = PromiseLike<T> | T;
export type GrafastResultsList<T> = ReadonlyArray<PromiseOrDirect<T>>;
export type GrafastResultStreamList<T> = ReadonlyArray<
  AsyncIterable<PromiseOrDirect<T>> | GrafastError
>;

export type BaseGraphQLRootValue = any;
export interface BaseGraphQLContext {}
export interface BaseGraphQLVariables {
  [key: string]: unknown;
}
export interface BaseGraphQLArguments {
  [key: string]: any;
}
export type BaseGraphQLInputObject = BaseGraphQLArguments;

// TODO: rename
export interface FieldArgs {
  get(path?: string | string[]): ExecutableStep;
  getRaw(path?: string | string[]): InputStep;
  apply($target: ExecutableStep | ModifierStep, path?: string | string[]): void;
}

export interface FieldInfo {
  field: GraphQLField<any, any, any>;
  schema: GraphQLSchema;
}

/**
 * Step resolvers are like regular resolvers except they're called beforehand,
 * they return plans rather than values, and they only run once for lists
 * rather than for each item in the list.
 *
 * The idea is that the plan resolver returns a plan object which later will
 * process the data and feed that into the actual resolver functions
 * (preferably using the default resolver function?).
 *
 * They are stored onto `<field>.extensions.graphile.plan`
 *
 * @returns a plan for this field.
 *
 * @remarks
 * We're using `TrackedObject<...>` so we can later consider caching these
 * executions.
 */
export type FieldPlanResolver<
  _TArgs extends BaseGraphQLArguments,
  TParentStep extends ExecutableStep<any> | null,
  TResultStep extends ExecutableStep<any>,
> = (
  $parentPlan: TParentStep,
  args: FieldArgs,
  info: FieldInfo,
) => TResultStep | null;

// TODO: review _TContext
/**
 * Fields on input objects can have plans; the plan resolver is passed a parent plan
 * (from an argument, or from a parent input object) or null if none, and an
 * input plan that represents the value the user will pass to this field. The
 * resolver must return either a ModifierStep or null.
 */
export type InputObjectFieldInputPlanResolver<
  TResultStep extends ExecutableStep<any> = ExecutableStep<any>,
> = (
  input: FieldArgs,
  info: {
    schema: GraphQLSchema;
    entity: GraphQLInputField;
  },
) => TResultStep;

export type InputObjectFieldApplyPlanResolver<
  TFieldStep extends ExecutableStep<any> | ModifierStep<any> =
    | ExecutableStep<any>
    | ModifierStep<any>,
  TResultStep extends ModifierStep<
    ExecutableStep<any> | ModifierStep<any>
  > | null | void = ModifierStep<
    ExecutableStep<any> | ModifierStep<any>
  > | null | void,
> = (
  $fieldPlan: TFieldStep,
  input: FieldArgs,
  info: {
    schema: GraphQLSchema;
    entity: GraphQLInputField;
  },
) => TResultStep;

export type InputObjectTypeInputPlanResolver = (
  input: FieldArgs,
  info: {
    schema: GraphQLSchema;
    type: GraphQLInputObjectType;
  },
) => ExecutableStep;

// TODO: review _TContext
/**
 * Arguments can have plans; the plan resolver is passed the parent plan (the
 * plan that represents the _parent_ field of the field the arg is defined on),
 * the field plan (the plan that represents the field the arg is defined on)
 * and an input plan that represents the value the user will pass to this
 * argument. The resolver must return either a ModifierStep or null.
 */
export type ArgumentInputPlanResolver<
  TParentStep extends ExecutableStep<any> = ExecutableStep<any>,
  TResultStep extends ExecutableStep<any> = ExecutableStep<any>,
> = (
  $parentPlan: TParentStep,
  input: FieldArgs,
  info: {
    schema: GraphQLSchema;
    entity: GraphQLArgument;
  },
) => TResultStep;

export type ArgumentApplyPlanResolver<
  TParentStep extends ExecutableStep<any> = ExecutableStep<any>,
  TFieldStep extends ExecutableStep<any> | ModifierStep<any> =
    | ExecutableStep<any>
    | ModifierStep<any>,
  TResultStep extends
    | ExecutableStep
    | ModifierStep<ExecutableStep | ModifierStep>
    | null
    | void =
    | ExecutableStep
    | ModifierStep<ExecutableStep | ModifierStep>
    | null
    | void,
> = (
  $parentPlan: TParentStep,
  $fieldPlan: TFieldStep,
  input: FieldArgs,
  info: {
    schema: GraphQLSchema;
    entity: GraphQLArgument;
  },
) => TResultStep;

/**
 * GraphQLScalarTypes can have plans, these are passed the field plan and must
 * return an executable plan.
 */
export type ScalarPlanResolver<
  TParentStep extends ExecutableStep<any> = ExecutableStep<any>,
  TResultStep extends ExecutableStep<any> = ExecutableStep<any>,
> = ($parentPlan: TParentStep, info: { schema: GraphQLSchema }) => TResultStep;

/**
 * GraphQLScalarTypes can have plans, these are passed the field plan and must
 * return an executable plan.
 */
export type ScalarInputPlanResolver<
  TResultStep extends ExecutableStep<any> = ExecutableStep<any>,
> = (
  $inputValue: InputStep,
  /*
    | __InputListStep
    | __InputStaticLeafStep
    | __InputDynamicScalarStep,
  */
  info: { schema: GraphQLSchema; type: GraphQLScalarType },
) => TResultStep;

/**
 * EXPERIMENTAL!
 *
 * NOTE: this is an `any` because we want to allow users to specify
 * subclasses of ExecutableStep but TypeScript only wants to allow
 * superclasses.
 *
 * @internal
 */
export type EnumValueApplyPlanResolver<
  TParentStep extends ExecutableStep | ModifierStep =
    | ExecutableStep
    | ModifierStep,
> = ($parent: TParentStep) => ModifierStep | void;

// TypeScript gets upset if we go too deep, so we try and cover the most common
// use cases and fall back to `any`
type OutputPlanForNamedType<TType extends GraphQLType> =
  TType extends GraphileObjectType<any, infer TStep, any>
    ? TStep
    : ExecutableStep<any>;

// TODO: this is completely wrong now; ListCapableStep is no longer required to be supported for lists.
export type OutputPlanForType<TType extends GraphQLOutputType> =
  TType extends GraphQLNonNull<GraphQLList<GraphQLNonNull<infer U>>>
    ? ListCapableStep<any, OutputPlanForNamedType<U>>
    : TType extends GraphQLNonNull<GraphQLList<infer U>>
    ? ListCapableStep<any, OutputPlanForNamedType<U>>
    : TType extends GraphQLList<GraphQLNonNull<infer U>>
    ? ListCapableStep<any, OutputPlanForNamedType<U>>
    : TType extends GraphQLList<infer U>
    ? ListCapableStep<any, OutputPlanForNamedType<U>>
    : TType extends GraphQLNonNull<infer U>
    ? OutputPlanForNamedType<U>
    : OutputPlanForNamedType<TType>;

// TypeScript gets upset if we go too deep, so we try and cover the most common
// use cases and fall back to `any`
type InputPlanForNamedType<TType extends GraphQLType> =
  TType extends GraphileInputObjectType<any, infer U, any>
    ? U
    : ModifierStep<any>;
type InputPlanForType<TType extends GraphQLInputType> =
  TType extends GraphQLNonNull<GraphQLList<GraphQLNonNull<infer U>>>
    ? InputPlanForNamedType<U>
    : TType extends GraphQLNonNull<GraphQLList<infer U>>
    ? InputPlanForNamedType<U>
    : TType extends GraphQLList<GraphQLNonNull<infer U>>
    ? InputPlanForNamedType<U>
    : TType extends GraphQLList<infer U>
    ? InputPlanForNamedType<U>
    : TType extends GraphQLNonNull<infer U>
    ? InputPlanForNamedType<U>
    : InputPlanForNamedType<TType>;

// TypeScript gets upset if we go too deep, so we try and cover the most common
// use cases and fall back to `any`
type InputTypeForNamedType<TType extends GraphQLType> =
  TType extends GraphQLScalarType<infer U> ? U : any;
type InputTypeFor<TType extends GraphQLInputType> =
  TType extends GraphQLNonNull<GraphQLList<GraphQLNonNull<infer U>>>
    ? InputTypeForNamedType<U>
    : TType extends GraphQLNonNull<GraphQLList<infer U>>
    ? InputTypeForNamedType<U>
    : TType extends GraphQLList<GraphQLNonNull<infer U>>
    ? InputTypeForNamedType<U>
    : TType extends GraphQLList<infer U>
    ? InputTypeForNamedType<U>
    : TType extends GraphQLNonNull<infer U>
    ? InputTypeForNamedType<U>
    : InputTypeForNamedType<TType>;

/*
type OutputPlanForType<TType extends GraphQLOutputType> =
  TType extends GraphQLList<
  infer U
>
  ? U extends GraphQLOutputType
    ? ListCapableStep<any, OutputPlanForType<U>>
    : never
  : TType extends GraphQLNonNull<infer V>
  ? V extends GraphQLOutputType
    ? OutputPlanForType<V>
    : never
  : TType extends GraphQLScalarType | GraphQLEnumType
  ? ExecutableStep<boolean | number | string>
  : ExecutableStep<{ [key: string]: any }>;

type InputPlanForType<TType extends GraphQLInputType> =
  TType extends GraphQLList<infer U>
    ? U extends GraphQLInputType
      ? InputPlanForType<U>
      : never
    : TType extends GraphQLNonNull<infer V>
    ? V extends GraphQLInputType
      ? InputPlanForType<V>
      : never
    : TType extends GraphQLScalarType | GraphQLEnumType
    ? null
    : ExecutableStep<{ [key: string]: any }> | null;

type InputTypeFor<TType extends GraphQLInputType> = TType extends GraphQLList<
  infer U
>
  ? U extends GraphQLInputType
    ? InputTypeFor<U>
    : never
  : TType extends GraphQLNonNull<infer V>
  ? V extends GraphQLInputType
    ? InputTypeFor<V>
    : never
  : TType extends GraphQLScalarType<infer U>
  ? U
  : any;
  */

/**
 * Basically GraphQLFieldConfig but with an easy to access `plan` method.
 */
export type GraphileFieldConfig<
  TType extends GraphQLOutputType,
  TContext extends BaseGraphQLContext,
  TParentStep extends ExecutableStep<any> | null,
  TFieldStep extends ExecutableStep<any>, // TODO: should be OutputPlanForType<TType>, but that results in everything thinking it should be a ListStep
  TArgs extends BaseGraphQLArguments,
> = Omit<GraphQLFieldConfig<any, any>, "args" | "type"> & {
  type: TType;
  plan?: FieldPlanResolver<TArgs, TParentStep, TFieldStep>;
  subscribePlan?: FieldPlanResolver<TArgs, TParentStep, TFieldStep>;
  args?: GraphileFieldConfigArgumentMap<
    TType,
    TContext,
    TParentStep,
    TFieldStep
  >;
};

/**
 * Basically GraphQLFieldConfigArgumentMap but allowing for args to have plans.
 */
export type GraphileFieldConfigArgumentMap<
  _TType extends GraphQLOutputType,
  TContext extends BaseGraphQLContext,
  TParentStep extends ExecutableStep<any> | null,
  TFieldStep extends ExecutableStep<any>, // TODO: should be OutputPlanForType<_TType>, but that results in everything thinking it should be a ListStep
> = {
  [argName: string]: GraphileArgumentConfig<
    any,
    TContext,
    TParentStep,
    TFieldStep,
    any,
    any
  >;
};

/**
 * Basically GraphQLArgumentConfig but allowing for a plan.
 */
export type GraphileArgumentConfig<
  TInputType extends GraphQLInputType,
  _TContext extends BaseGraphQLContext,
  _TParentStep extends ExecutableStep<any> | null,
  TFieldStep extends ExecutableStep<any>,
  _TArgumentStep extends TFieldStep extends ExecutableStep<any>
    ? ModifierStep<TFieldStep> | null
    : null,
  _TInput extends InputTypeFor<TInputType>,
> = Omit<GraphQLArgumentConfig, "type"> & {
  type: TInputType;
  inputPlan?: ArgumentInputPlanResolver<any>;
  applyPlan?: ArgumentApplyPlanResolver<any, any>;
};

/**
 * Basically GraphQLInputFieldConfig but allowing for the field to have a plan.
 */
export type GraphileInputFieldConfig<
  TInputType extends GraphQLInputType,
  _TContext extends BaseGraphQLContext,
  _TParentStep extends ModifierStep<any>,
  _TResultStep extends InputPlanForType<TInputType>,
  _TInput extends InputTypeFor<TInputType>,
> = Omit<GraphQLInputFieldConfig, "type"> & {
  type: TInputType;
  inputPlan?: InputObjectFieldInputPlanResolver;
  applyPlan?: InputObjectFieldApplyPlanResolver<any>;
};

/**
 * The args passed to a field plan resolver, the values are plans.
 */
export type TrackedArguments<
  TArgs extends BaseGraphQLArguments = BaseGraphQLArguments,
> = {
  get<TKey extends keyof TArgs>(key: TKey): InputStep;
};

/**
 * `@stream` directive meta.
 */
export interface StepStreamOptions {
  initialCount: number;
}
/**
 * Additional details about the planning for a field; currently only relates to
 * the `@stream` directive.
 */
export interface StepOptions {
  /**
   * Details for the `@stream` directive.
   */
  stream: StepStreamOptions | null;
}

/**
 * Options passed to the `optimize` method of a plan to give more context.
 */
export interface StepOptimizeOptions {
  stream: StepStreamOptions | null;
}

/**
 * A subscriber provides realtime data, a SubscribeStep can subscribe to a
 * given topic (string) and will receive an AsyncIterableIterator with messages
 * published to that topic (standard pub/sub semantics).
 */
export type GrafastSubscriber<
  TTopics extends { [key: string]: any } = { [key: string]: any },
> = {
  subscribe<TTopic extends keyof TTopics = keyof TTopics>(
    topic: TTopic,
  ): AsyncIterableIterator<TTopics[TTopic]>;
};

/**
 * Specifically relates to the stringification of NodeIDs, e.g. `["User", 1]`
 * to/from `WyJVc2VyIiwgMV0=`
 */
export interface NodeIdCodec<T = any> {
  encode(value: T): string | null;
  decode(value: string): T;
}

/**
 * Determines if a NodeID relates to a given object type, and also relates to
 * encoding the NodeID for that type.
 */
export type NodeIdHandler<
  TCodecs extends { [key: string]: NodeIdCodec<any> } = {
    [key: string]: NodeIdCodec<any>;
  },
  TCodecName extends keyof TCodecs = keyof TCodecs,
  TNodeStep extends ExecutableStep<any> = ExecutableStep<any>,
  TSpec = any,
> = {
  /**
   * The name of the object type this handler is for.
   */
  typeName: string;

  /**
   * Which codec are we using to encode/decode the NodeID string?
   */
  codecName: TCodecName & string;

  /**
   * Returns true if the given decoded Node ID value represents this type.
   */
  match(
    specifier: TCodecs[TCodecName] extends NodeIdCodec<infer U> ? U : any,
  ): boolean;

  /**
   * Returns a plan that returns the value ready to be encoded. When the result
   * of this plan is fed into `match`, it should return `true`.
   */
  plan(
    $thing: TNodeStep,
  ): ExecutableStep<TCodecs[TCodecName] extends NodeIdCodec<infer U> ? U : any>;

  /**
   * Returns a specification based on the Node ID, this can be in any format
   * you like. It is intended to then be fed into `get` or handled in your own
   * code as you see fit. (When used directly, it's primarily useful for
   * referencing a node without actually fetching it - e.g. allowing you to
   * delete a node by its ID without first fetching it.)
   */
  getSpec(
    plan: ExecutableStep<
      TCodecs[TCodecName] extends NodeIdCodec<infer U> ? U : any
    >,
  ): TSpec;

  /**
   * Combined with `getSpec`, this forms the recprocal of `plan`; i.e.
   * `get(getSpec( plan(node) ))` should return a plan that results in the
   * original node.
   */
  get(spec: TSpec): TNodeStep;

  deprecationReason?: string;
};

export type BaseEventMap = Record<string, any>;
export type EventMapKey<TEventMap extends BaseEventMap> = string &
  keyof TEventMap;
export type EventCallback<TPayload> = (params: TPayload) => void;

export interface TypedEventEmitter<TEventMap extends BaseEventMap>
  extends EventEmitter<any, any> {
  addListener<TEventName extends EventMapKey<TEventMap>>(
    eventName: TEventName,
    callback: EventCallback<TEventMap[TEventName]>,
  ): this;
  on<TEventName extends EventMapKey<TEventMap>>(
    eventName: TEventName,
    callback: EventCallback<TEventMap[TEventName]>,
  ): this;
  once<TEventName extends EventMapKey<TEventMap>>(
    eventName: TEventName,
    callback: EventCallback<TEventMap[TEventName]>,
  ): this;

  removeListener<TEventName extends EventMapKey<TEventMap>>(
    eventName: TEventName,
    callback: EventCallback<TEventMap[TEventName]>,
  ): this;
  off<TEventName extends EventMapKey<TEventMap>>(
    eventName: TEventName,
    callback: EventCallback<TEventMap[TEventName]>,
  ): this;

  emit<TEventName extends EventMapKey<TEventMap>>(
    eventName: TEventName,
    params: TEventMap[TEventName],
  ): boolean;
}

export type ExecutionEventMap = {
  /**
   * Something that can be added to the
   * ExecutionResult.extensions.explain.operations list.
   */
  explainOperation: {
    operation: Record<string, any> & { type: string; title: string };
  };
};

export type ExecutionEventEmitter = TypedEventEmitter<ExecutionEventMap>;

// TODO: rename this?
export interface ExecutionExtra {
  meta: Record<string, unknown>;
  eventEmitter: ExecutionEventEmitter | undefined;

  // These are only needed for subroutine plans, don't use them as we may
  // remove them later.
  /** @internal */
  _bucket: Bucket;
  /** @internal */
  _requestContext: RequestContext;
}

export interface LocationDetails {
  node: ASTNode | readonly ASTNode[];
  /** This should only be null for the root selection */
  parentTypeName: string | null;
  /** This should only be null for the root selection */
  fieldName: string | null;
}

export type JSONValue =
  | boolean
  | number
  | string
  | null
  | JSONObject
  | JSONArray;
export interface JSONObject {
  [key: string]: JSONValue;
}
export interface JSONArray extends Array<JSONValue> {}
