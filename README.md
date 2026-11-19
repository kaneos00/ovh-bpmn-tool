> **Repères de développement :** la branche historique `V0.8` est obsolète. La référence V0.8 consolidée est `feat/process-creation-metadata` au commit `93aff50b1bfd5763cc7cef78db0f553eccae3bb2`. Lire impérativement [BRANCH-BASELINES.md](./BRANCH-BASELINES.md) avant toute comparaison, reprise ou déploiement.

# BPMN Manager with bpmn-js

## Description

This project is a comprehensive BPMN (Business Process Model and Notation) diagram manager, designed to help users organize, sort, delete, and manage their BPMN models intuitively and efficiently. Built on the powerful [bpmn-js](https://bpmn.io/) library, our solution offers a user-friendly interface with additional features to simplify the management of BPMN diagrams in complex environments.

BPMN is a widely adopted standard for graphically representing business processes. However, as organizations handle numerous models, managing these diagrams can quickly become a challenge. This project aims to solve this issue by providing a centralized and easy-to-use platform to organize, manage and sort BPMN models, with advanced capabilities beyond the basic features offered by bpmn-js.

### Why Use This Tool?

- **Simplified Management**: Whether for business process architects, developers or project managers, the tool provides a user-friendly way to organize and manage process models.
- **Enhanced Organization**: Quickly find relevant diagrams through sorting and filtering.
- **Batch Editing and Deletion**: Manage multiple diagrams in one operation.
- **Seamless bpmn-js Integration**: Native compatibility with BPMN files.

### Use Cases

- **For Businesses**: Centralized management of business processes.
- **For Development Teams**: Iterative management and maintenance of BPMN models.
- **For Digital Transformation Consultants**: Centralized process modeling and evolution tracking.

## Features

- Self-hosted application
- Create folders and sub-folders to organize, build and import business process
- Manage, sort and filter business process and folders
- Import existing BPMN or export as .bpmn or .svg
- View, edit, clone and compare version histories with various status (published, draft or obsolete)
- Integration with the [bpmn-js](https://bpmn.io/) library.

## Getting started

```bash
# Clone the repository
$ git clone https://github.com/ovh/bpmn-tool.git
```

Then follow [backend README](./backend/README.md) and [frontend README](./frontend/README.md).

## Related links

- Contribute: https://github.com/ovh/bpmn-tool/blob/main/CONTRIBUTING.md
- Report bugs: https://github.com/ovh/bpmn-tool/issues

## Screenshots

|                                                                                                  |                                                                                                                       |
| ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| [![bpmn-tool-root](./docs/assets/bpmn-tool-root.png)](./docs/assets/bpmn-tool-root.png)          | [![bpmn-tool-process-viewer](./docs/assets/bpmn-tool-process-viewer.png)](./docs/assets/bpmn-tool-process-viewer.png) |
| [![bpmn-tool-modeler](./docs/assets/bpmn-tool-modeler.png)](./docs/assets/bpmn-tool-modeler.png) | [![bpmn-tool-compare](./docs/assets/bpmn-tool-process-compare.png)](./docs/assets/bpmn-tool-process-compare.png)      |

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](./LICENSE) file for details.

The main library used in this project is [bpmn-js](https://bpmn.io/) (see license [here](https://bpmn.io/license/)).

All dependencies licenses are listed in the `LICENSES` folder.
