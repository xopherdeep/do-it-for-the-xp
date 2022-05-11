import * as IonComponents  from "@ionic/vue";
import { defineComponent } from "vue";

const components = {} 

Object.keys(IonComponents).forEach(key => {
  if (/^Ion[A-Z]\w+$/.test(key)) {
    components[key] = IonComponents[key]

  }
  // if (/^[a-z]\w*Controller$/.test(key)) {
  //   components[key] = IonComponents[key]
  // }
});

const Ion = defineComponent({components})

export default Ion