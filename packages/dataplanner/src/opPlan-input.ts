import type {
  GraphQLArgument,
  GraphQLField,
  GraphQLInputField,
  GraphQLInputType,
} from "graphql";
import {
  getNullableType,
  isEnumType,
  isInputObjectType,
  isListType,
  isNonNullType,
  isScalarType,
} from "graphql";

import type {
  __InputObjectStep,
  __TrackedObjectStep,
  OpPlan,
} from "./index.js";
import type { InputStep } from "./input.js";
import type {
  FieldArgs,
  InputObjectTypeInputPlanResolver,
  TrackedArguments,
} from "./interfaces.js";
import type { ModifierStep } from "./step.js";
import { assertExecutableStep, ExecutableStep } from "./step.js";
import type { __ItemStep } from "./steps/__item.js";
import { constant, ConstantStep } from "./steps/constant.js";
import { list } from "./steps/list.js";
import { object } from "./steps/object.js";

export function withFieldArgsForArguments<
  T extends ExecutableStep,
  TParentStep extends ExecutableStep<any> = ExecutableStep<any>,
>(
  opPlan: OpPlan,
  parentPlan: TParentStep,
  $all: TrackedArguments,
  field: GraphQLField<any, any, any>,
  callback: (fieldArgs: FieldArgs) => T,
): Exclude<T, undefined | null | void> | TParentStep {
  const fields: {
    [key: string]: GraphQLArgument;
  } = {};
  const args = field.args;
  for (const arg of args) {
    fields[arg.name] = arg;
  }
  return withFieldArgsForArgumentsOrInputObject(
    opPlan,
    null,
    parentPlan,
    $all,
    fields,
    callback,
  );
}

function withFieldArgsForArgumentsOrInputObject<
  T extends ExecutableStep | ModifierStep | null | void,
  TParentStep extends ExecutableStep,
>(
  opPlan: OpPlan,
  typeContainingFields: GraphQLInputType | null,
  parentPlan: TParentStep,
  $current: TrackedArguments | InputStep, //__TrackedObjectStep | __InputObjectStep,
  fields: {
    [key: string]: GraphQLArgument | GraphQLInputField;
  } | null,
  callback: (fieldArgs: FieldArgs) => T,
): Exclude<T, undefined | null | void> | TParentStep {
  const schema = opPlan.schema;
  const analyzedCoordinates: string[] = [];

  const getArgOnceOnly = (inPath: string | string[]) => {
    const path = Array.isArray(inPath) ? [...inPath] : [inPath];
    if (path.length < 1) {
      throw new Error("Invalid");
    }

    if (!fields) {
      throw new Error("path is invalid when dealing with a leaf field or list");
    }

    const id = path.join(".");
    if (!analyzedCoordinates.includes(id)) {
      analyzedCoordinates.push(id);
    }

    const $currentObject = $current as
      | TrackedArguments
      | __TrackedObjectStep
      | __InputObjectStep;

    const argName = path.shift()!;
    let $value = ($currentObject.get as (argName: string) => InputStep)(
      argName,
    );
    let argOrField: GraphQLArgument | GraphQLInputField = fields[argName];

    /*
    if ($value.evalIs(undefined)) {
      return undefined;
    }
    */

    let type = getNullableType(argOrField.type);

    while (path.length > 0) {
      const name = path.shift()!;
      if (!isInputObjectType(type)) {
        throw new Error(
          `Cannot process '${type}' through args; expected input object`,
        );
      }
      $value = (
        ($value as __TrackedObjectStep | __InputObjectStep).get as (
          name: string,
        ) => InputStep
      )(name);
      /*
      if ($value.evalIs(undefined)) {
        return undefined;
      }
      */
      argOrField = type.getFields()[name];
      type = getNullableType(argOrField.type);
    }

    return { $value, argOrField, type };
  };

  function planArgumentOrInputField(
    details: ReturnType<typeof getArgOnceOnly>,
    $toPlan: ExecutableStep | ModifierStep | null,
  ) {
    const plan = opPlan.withModifiers(() => {
      const { argOrField, $value } = details;

      return withFieldArgsForArgOrField(
        opPlan,
        parentPlan,
        argOrField,
        $value,
        (fieldArgs) => {
          if (!typeContainingFields) {
            const arg = argOrField as GraphQLArgument;
            if ($toPlan) {
              const argResolver = arg.extensions.graphile?.applyPlan;
              if (argResolver) {
                return argResolver(parentPlan, $toPlan, fieldArgs, {
                  schema,
                  entity: argOrField as GraphQLArgument,
                });
              } else {
                return $toPlan;
              }
            } else {
              const argResolver = arg.extensions.graphile?.inputPlan;
              if (argResolver) {
                return argResolver(parentPlan, fieldArgs, {
                  schema,
                  entity: argOrField as GraphQLArgument,
                });
              } else {
                return fieldArgs.get();
              }
            }
          } else {
            const field = argOrField as GraphQLInputField;
            if ($toPlan) {
              const fieldResolver = field.extensions.graphile?.applyPlan;
              if (fieldResolver) {
                return fieldResolver($toPlan, fieldArgs, {
                  schema,
                  entity: argOrField as GraphQLInputField,
                });
              } else {
                return $toPlan;
              }
            } else {
              const fieldResolver = field.extensions.graphile?.inputPlan;
              if (fieldResolver) {
                return fieldResolver(fieldArgs, {
                  schema,
                  entity: argOrField as GraphQLInputField,
                });
              } else {
                return fieldArgs.get();
              }
            }
          }
        },
      );
    });
    return plan;
  }

  function getPlannedValue(
    $value: InputStep,
    currentType: GraphQLInputType,
  ): ExecutableStep {
    if (isNonNullType(currentType)) {
      return getPlannedValue($value, currentType.ofType);
    } else if (isListType(currentType)) {
      if (!("evalLength" in $value)) {
        throw new Error(
          `GraphileInternalError<6ef74af7-7be0-4117-870f-2ebabcf5161c>: Expected ${$value} to be a __InputListStep or __TrackedObjectStep (i.e. to have 'evalLength')`,
        );
      }
      const l = $value.evalLength();
      if (l == null) {
        return constant(null);
      }
      const entries: ExecutableStep[] = [];
      for (let i = 0; i < l; i++) {
        const entry = getPlannedValue($value.at(i), currentType.ofType);
        entries.push(entry);
      }
      return list(entries);
    } else if (isInputObjectType(currentType)) {
      const typeResolver =
        currentType.extensions.graphile?.inputPlan ||
        defaultInputObjectTypeInputPlanResolver;
      return withFieldArgsForArgumentsOrInputObject(
        opPlan,
        currentType,
        parentPlan,
        $value as any,
        currentType.getFields(),
        (fieldArgs) =>
          typeResolver(fieldArgs, {
            schema,
            type: currentType,
          }),
      );
    } else if (isScalarType(currentType)) {
      const scalarResolver = currentType.extensions.graphile?.inputPlan;
      if (scalarResolver) {
        return scalarResolver($value, { schema, type: currentType });
      } else {
        return $value;
      }
    } else if (isEnumType(currentType)) {
      /*
      const enumResolver = currentType.extensions.graphile?.inputPlan;
      if (enumResolver) {
        return enumResolver($value, { schema, type: currentType });
      } else {
        return $value;
      }
      */
      return $value;
    } else {
      const never: never = currentType;
      throw new Error(`Unhandled input type ${never}`);
    }
  }

  function applyPlannedValue(
    $value: InputStep,
    currentType: GraphQLInputType,
    $toPlan: ExecutableStep | ModifierStep,
  ): void {
    if (isNonNullType(currentType)) {
      applyPlannedValue($value, currentType.ofType, $toPlan);
      return;
    } else if (isListType(currentType)) {
      if (!("evalLength" in $value)) {
        throw new Error(
          `GraphileInternalError<6ef74af7-7be0-4117-870f-2ebabcf5161c>: Expected ${$value} to be a __InputListStep or __TrackedObjectStep (i.e. to have 'evalLength')`,
        );
      }
      const l = $value.evalLength();
      if (l == null) {
        return;
      }
      for (let i = 0; i < l; i++) {
        applyPlannedValue($value.at(i), currentType.ofType, $toPlan);
      }
      return;
    } else if (isInputObjectType(currentType)) {
      const fields = currentType.getFields();
      for (const fieldName in fields) {
        const field = fields[fieldName];
        const resolver = field.extensions.graphile?.applyPlan;
        if (resolver) {
          withFieldArgsForArgumentsOrInputObject(
            opPlan,
            currentType,
            parentPlan,
            $value as any,
            currentType.getFields(),
            (fieldArgs) =>
              resolver($toPlan, fieldArgs, {
                schema,
                entity: field,
              }),
          );
        }
      }
      return;
    } else if (isScalarType(currentType)) {
      return;
    } else if (isEnumType(currentType)) {
      // TODO: only do this if this enum type has values that have side effects
      const value = $value.eval();
      const enumValue = currentType.getValues().find((v) => v.value === value);
      const enumResolver = enumValue?.extensions.graphile?.applyPlan;
      if (enumResolver) {
        enumResolver($toPlan);
      }
      return;
    } else {
      const never: never = currentType;
      throw new Error(`Unhandled input type ${never}`);
    }
  }

  const fieldArgs: FieldArgs = {
    get(path) {
      if (!path || (Array.isArray(path) && path.length === 0)) {
        analyzedCoordinates.push("");
        if (!typeContainingFields) {
          throw new Error(
            "You cannot call `get()` without a path in this situation",
          );
        } else {
          return getPlannedValue($current as InputStep, typeContainingFields);
        }
      }
      const details = getArgOnceOnly(path);
      const plan = planArgumentOrInputField(details, null);

      assertExecutableStep(plan, `UNKNOWN` /* TODO: pathIdentity */);
      return plan;
    },
    getRaw(path) {
      if (!path || (Array.isArray(path) && path.length === 0)) {
        analyzedCoordinates.push("");
        if ($current instanceof ExecutableStep) {
          return $current;
        } else {
          throw new Error("You must getRaw a specific argument by name");
        }
      }
      const details = getArgOnceOnly(path);
      return details.$value; // details ? details.$value : undefined;
    },
    apply($target, path) {
      if (!path || (Array.isArray(path) && path.length === 0)) {
        analyzedCoordinates.push("");
        if (typeContainingFields && ($current as InputStep).evalIs(undefined)) {
          return;
        }
        if (fields) {
          for (const fieldName of Object.keys(fields)) {
            fieldArgs.apply($target, fieldName);
          }
          return;
        } else {
          if (!typeContainingFields) {
            throw new Error(
              "You cannot call `apply()` without a path in this situation",
            );
          } else {
            return applyPlannedValue(
              $current as InputStep,
              typeContainingFields,
              $target,
            );
          }
        }
      }
      const details = getArgOnceOnly(path);
      if (details.$value.evalIs(undefined)) {
        return;
      }
      const plan = planArgumentOrInputField(details, $target);
      /*
      if (plan && plan !== $target) {
        assertModifierStep(
          plan,
          `UNKNOWN` /* TODO : `${objectType.name}.${field.name}(${argName}:)` * /,
        );
      }
    */
      return plan;
    },
  };
  const plan = (callback(fieldArgs) ?? parentPlan) as
    | ExecutableStep
    | ModifierStep;

  // Now handled all the remaining coordinates
  if (
    !analyzedCoordinates.includes("") &&
    plan != null &&
    !(plan instanceof ConstantStep && plan.isNull())
  ) {
    if (!fields) {
      fieldArgs.apply(plan);
    } else {
      const process = (
        layerFields: typeof fields,
        parentPath: readonly string[] = [],
      ) => {
        for (const fieldName in layerFields) {
          const field = layerFields[fieldName];
          const newPath = [...parentPath, fieldName];
          const pathStr = newPath.join(".");
          const prefix = `${pathStr}.`;
          if (analyzedCoordinates.includes(pathStr)) {
            continue;
          } else if (analyzedCoordinates.some((c) => c.startsWith(prefix))) {
            const inputObjectType = getNullableType(field.type);
            if (!isInputObjectType(inputObjectType)) {
              throw new Error(
                `GraphileInternalError<1ac45a76-a21e-4f25-841c-59c73ddcf70c>: How could this not be an object type given we have a path that uses it?!`,
              );
            }
            process(inputObjectType.getFields(), newPath);
            // recurse
          } else {
            fieldArgs.apply(plan, newPath);
          }
        }
      };
      process(fields);
    }
  }

  return plan as any;
}

function withFieldArgsForArgOrField<
  T extends ExecutableStep | ModifierStep | null | void,
  TParentStep extends ExecutableStep,
>(
  opPlan: OpPlan,
  parentPlan: TParentStep,
  argOrField: GraphQLArgument | GraphQLInputField,
  $value: InputStep,
  callback: (fieldArgs: FieldArgs) => T,
): Exclude<T, undefined | null | void> | TParentStep {
  const type = argOrField.type;
  const nullableType = getNullableType(type);
  const fields = isInputObjectType(nullableType)
    ? nullableType.getFields()
    : null;
  return withFieldArgsForArgumentsOrInputObject(
    opPlan,
    type,
    parentPlan,
    $value,
    fields,
    callback,
  );
}

const defaultInputObjectTypeInputPlanResolver: InputObjectTypeInputPlanResolver =
  (input, info) => {
    const fields = info.type.getFields();
    const obj: { [key: string]: ExecutableStep } = {};
    for (const fieldName in fields) {
      obj[fieldName] = input.get(fieldName);
    }
    return object(obj);
  };
