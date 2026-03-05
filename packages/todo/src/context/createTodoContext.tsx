/** @jsx jsx */
import { jsx, Context, Text, Group, Tool, Data } from '@context-ai/ctp';
import { AddTodoParams, IdParams, EmptyParams, type TodoItem } from '../todo/types.js';
import { getTodoItems } from '../todo/getTodoItems.js';
import { renderTodoLine } from '../todo/renderTodoLine.js';
import { addTodo } from '../tools/addTodo.js';
import { toggleTodo } from '../tools/toggleTodo.js';
import { deleteTodo } from '../tools/deleteTodo.js';
import { clearTodos } from '../tools/clearTodos.js';

export function createTodoContext() {
  return (
    <Context name="Todo Demo" description="Simple TODO List demo using CTP" metadata={{ author: "杨明明", version: `1.0.0`, currentTime: new Date() }}>
      <Group title="Todo List">
        <Text>Current items:</Text>
        <Data<TodoItem> title="Todo List" source={getTodoItems()} render={renderTodoLine} />
      </Group>
      <Tool
        name="addTodo"
        label="addTodo"
        description="Add a new todo item"
        parameters={AddTodoParams}
        execute={addTodo}
      />
      <Tool
        name="toggleTodo"
        label="toggleTodo"
        description="Toggle completion status of a todo"
        parameters={IdParams}
        execute={toggleTodo}
      />
      <Tool
        name="deleteTodo"
        label="deleteTodo"
        description="Delete a todo item"
        parameters={IdParams}
        execute={deleteTodo}
      />
      <Tool
        name="clearTodos"
        label="clearTodos"
        description="Clear all todo items"
        parameters={EmptyParams}
        execute={clearTodos}
      />
    </Context>
  );
}
