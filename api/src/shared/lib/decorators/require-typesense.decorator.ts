import { config } from '../../config/config';

export default function RequireTypesense(): MethodDecorator {
  return (_target, _key, descriptor: PropertyDescriptor): PropertyDescriptor => {
    const originalMethod: (...args: any[]) => unknown = descriptor.value;

    descriptor.value = function (...args: any[]): void {
      if (!config.get('typesenseEnabled'))
        return;
      return Reflect.apply(originalMethod, this, args);
    };

    return descriptor;
  };
}
