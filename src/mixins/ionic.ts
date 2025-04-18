import * as IonComponents  from "@ionic/vue";
import { defineComponent, Component } from "vue";

interface IonComponentsMap {
  [key: string]: Component
}

const components: IonComponentsMap = {} 

Object.keys(IonComponents).forEach((key: string) => {
  if (/^Ion[A-Z]\w+$/.test(key)) {
    components[key] = IonComponents[key as keyof typeof IonComponents] as Component;
  }
});

// if (/^[a-z]\w*Controller$/.test(key)) {
//   components[key] = IonComponents[key]
// }

const Ionic = defineComponent({ components })

export default Ionic;