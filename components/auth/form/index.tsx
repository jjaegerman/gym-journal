import { ReactNode, useId } from "react";
import {
  useForm,
  UseFormReturn,
  FieldValues,
  SubmitHandler,
  RegisterOptions,
} from "react-hook-form";
import {
  Form as TamaguiForm,
  Input,
  InputProps,
  Label,
  YStack,
  Button,
  ButtonProps,
  Text,
} from "tamagui";
import { Controller } from "react-hook-form";

// Form Context
import { createContext, useContext } from "react";

interface FormContextValue {
  form: UseFormReturn<any>;
}

const FormContext = createContext<FormContextValue | null>(null);

function useFormContext() {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error("Form components must be used within a Form component");
  }
  return context;
}

// Form Component
interface FormProps<TFieldValues extends FieldValues> {
  onSubmit: SubmitHandler<TFieldValues>;
  defaultValues?: TFieldValues;
  children: ReactNode;
}

export function Form<TFieldValues extends FieldValues>({
  onSubmit,
  defaultValues,
  children,
}: FormProps<TFieldValues>) {
  const form = useForm<TFieldValues>({
    defaultValues: defaultValues as any,
  });

  return (
    <FormContext.Provider value={{ form }}>
      <TamaguiForm onSubmit={form.handleSubmit(onSubmit)} gap="$3">
        {children}
      </TamaguiForm>
    </FormContext.Provider>
  );
}

// Form Input Component
interface FormInputProps {
  name: string;
  label?: string;
  placeholder?: string;
  secureTextEntry?: boolean;
  id?: string;
  rules?: RegisterOptions;
}

function FormInput({
  name,
  label,
  placeholder,
  secureTextEntry,
  id,
  rules,
}: FormInputProps) {
  const { form } = useFormContext();
  const error = form.formState.errors[name];
  const generatedId = useId();
  const inputId = id || `${generatedId}-${name}`;

  return (
    <YStack gap="$2">
      {label && <Label htmlFor={inputId}>{label}</Label>}
      <Controller
        control={form.control}
        name={name}
        rules={rules}
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            id={inputId}
            placeholder={placeholder}
            secureTextEntry={secureTextEntry}
            value={value ?? ""}
            onChangeText={onChange}
            onBlur={onBlur}
            borderColor={error ? "$red10" : undefined}
          />
        )}
      />
      {error && (
        <Text color="$red10" fontSize="$2">
          {error.message as string}
        </Text>
      )}
    </YStack>
  );
}

// Form Trigger Component
interface FormTriggerProps extends ButtonProps {
  asChild?: boolean;
  children: ReactNode;
}

function FormTrigger({ asChild, children, ...props }: FormTriggerProps) {
  if (asChild) {
    return (
      <TamaguiForm.Trigger asChild {...props}>
        {children}
      </TamaguiForm.Trigger>
    );
  }
  return <TamaguiForm.Trigger {...props}>{children}</TamaguiForm.Trigger>;
}

// Attach sub-components
Form.Input = FormInput;
Form.Trigger = FormTrigger;
