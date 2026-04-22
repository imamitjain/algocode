# C++ Pointers -- Comprehensive Guide

This guide assumes you already know the basics: declaring a pointer (`int* p`),
taking an address (`&x`), and dereferencing (`*p`). Everything below builds on
that foundation.

---

## Table of Contents

1. [Pointer Arithmetic](#1-pointer-arithmetic)
2. [Pointers and Arrays](#2-pointers-and-arrays)
3. [Const Correctness with Pointers](#3-const-correctness-with-pointers)
4. [Pointer-to-Pointer (Multi-level Indirection)](#4-pointer-to-pointer-multi-level-indirection)
5. [Void Pointers](#5-void-pointers)
6. [nullptr and Null Pointer Safety](#6-nullptr-and-null-pointer-safety)
7. [Function Pointers](#7-function-pointers)
8. [Pointers and Functions](#8-pointers-and-functions)
9. [Dynamic Memory (new / delete)](#9-dynamic-memory-new--delete)
10. [Smart Pointers (Modern C++)](#10-smart-pointers-modern-c)
11. [Pointer Casting](#11-pointer-casting)
12. [The this Pointer](#12-the-this-pointer)
13. [Pointers to Class Members](#13-pointers-to-class-members)
14. [Iterators as Generalized Pointers](#14-iterators-as-generalized-pointers)
15. [Common Pitfalls and Undefined Behavior](#15-common-pitfalls-and-undefined-behavior)
16. [Best Practices Summary](#16-best-practices-summary)

---

## 1. Pointer Arithmetic

Pointer arithmetic doesn't move by bytes -- it moves by `sizeof(T)`. An `int*`
incremented by 1 advances by 4 bytes (on most platforms), not 1.

```cpp
int arr[] = {10, 20, 30, 40, 50};
int* p = arr;

p++;          // now points to arr[1] (moved 4 bytes forward)
p += 2;       // now points to arr[3]
p--;          // back to arr[2]

// Pointer subtraction yields the number of elements between two pointers,
// not the number of bytes.
int* a = &arr[1];
int* b = &arr[4];
ptrdiff_t dist = b - a;  // 3 (elements, not 12 bytes)

// Comparison -- only meaningful within the same array (or one-past-end).
if (a < b) { /* a comes before b in the array */ }
```

**Rules:**
- You can only do arithmetic on pointers to complete object types.
- Arithmetic on `void*` is **illegal** in standard C++ (`void` has no size).
  GCC allows it as an extension (treats it as `char*`), but don't rely on it.
- Going more than one element past the end of an array is **undefined behavior**.

---

## 2. Pointers and Arrays

An array name decays to a pointer to its first element in most contexts. This is
the single most important pointer-array relationship to internalize.

```cpp
int arr[5] = {1, 2, 3, 4, 5};

// These are identical:
int* p = arr;        // array decays to &arr[0]
int* q = &arr[0];

// Subscript is syntactic sugar for pointer arithmetic:
arr[3]    == *(arr + 3)   // true
3[arr]    == *(3 + arr)   // also true (addition is commutative) -- don't write this
```

### Pointer to an array vs array of pointers

```cpp
int arr[5] = {1, 2, 3, 4, 5};

// Pointer to an entire array of 5 ints
int (*pArr)[5] = &arr;    // pArr points to the whole array
// *pArr is the array itself, (*pArr)[2] == 3

// Array of 5 pointers to int
int* ptrArr[5];            // each element is an int*
for (int i = 0; i < 5; i++)
    ptrArr[i] = &arr[i];
```

> **Tip:** Read declarations inside-out. `int (*p)[5]` -- `p` is a pointer to
> an array of 5 ints. `int* p[5]` -- `p` is an array of 5 pointers to int.

### Multidimensional arrays and pointers

```cpp
int grid[3][4] = {{1,2,3,4}, {5,6,7,8}, {9,10,11,12}};

// grid decays to int(*)[4] -- a pointer to an array of 4 ints
int (*row)[4] = grid;

row[1][2];          // 7  -- second row, third column
*(*(row + 1) + 2);  // 7  -- equivalent pointer arithmetic
```

### When arrays do NOT decay

Arrays don't decay to pointers in three contexts:
- `sizeof(arr)` returns the full array size, not `sizeof(int*)`.
- `&arr` gives a pointer to the array type, not pointer to the first element.
- `decltype(arr)` preserves the array type.

---

## 3. Const Correctness with Pointers

There are three combinations of `const` with pointers. The position of `const`
relative to `*` determines what is immutable.

```cpp
int x = 10, y = 20;

// 1. Pointer to const -- can't modify the value through this pointer
const int* p1 = &x;      // (equivalently: int const* p1 = &x;)
// *p1 = 30;              // ERROR: data is read-only
p1 = &y;                  // OK: pointer itself can change

// 2. Const pointer -- can't change where the pointer points
int* const p2 = &x;
*p2 = 30;                 // OK: can modify the data
// p2 = &y;               // ERROR: pointer is fixed

// 3. Const pointer to const -- nothing can change
const int* const p3 = &x;
// *p3 = 30;              // ERROR
// p3 = &y;               // ERROR
```

### The right-to-left reading rule

Read the declaration from right to left, starting at the variable name:

| Declaration            | Read right-to-left                              |
|------------------------|--------------------------------------------------|
| `const int* p`         | p is a pointer to an int that is const           |
| `int* const p`         | p is a const pointer to an int                   |
| `const int* const p`   | p is a const pointer to a const int              |

> **Gotcha:** `const int*` and `int const*` mean the same thing. The `const`
> binds to whatever is immediately to its left -- if nothing is to its left, it
> binds to whatever is to its right.

---

## 4. Pointer-to-Pointer (Multi-level Indirection)

A pointer-to-pointer stores the address of another pointer. Each `*` adds one
level of indirection.

```cpp
int val = 42;
int* p = &val;
int** pp = &p;

**pp = 100;   // modifies val through two levels of indirection
```

### Modifying a caller's pointer

The classic use case: a function that needs to change which object a pointer
points to (not just the value at the address).

```cpp
void allocate(int** out) {
    *out = new int(42);   // modifies the caller's pointer
}

int main() {
    int* p = nullptr;
    allocate(&p);         // p now points to a heap-allocated 42
    delete p;
}
```

In modern C++, prefer a reference-to-pointer (`int*& out`) or return the pointer
instead.

### Dynamic 2D arrays

```cpp
int rows = 3, cols = 4;
int** grid = new int*[rows];
for (int i = 0; i < rows; i++)
    grid[i] = new int[cols]();  // () zero-initializes

grid[1][2] = 7;

for (int i = 0; i < rows; i++)
    delete[] grid[i];
delete[] grid;
```

> **Tip:** Prefer `vector<vector<int>>` or a flat `vector<int>` with manual
> index math (`row * cols + col`) for better cache performance.

---

## 5. Void Pointers

`void*` is a generic pointer that can hold the address of any object type. It
sacrifices type safety for generality.

```cpp
int n = 42;
double d = 3.14;

void* vp = &n;       // OK: any object pointer converts to void*
vp = &d;             // OK: can point to any type

// Must cast back to the correct type before dereferencing
double* dp = static_cast<double*>(vp);
double val = *dp;    // 3.14
```

**Rules:**
- You cannot dereference a `void*` directly -- the compiler doesn't know the size.
- You cannot do pointer arithmetic on `void*` (no `sizeof(void)`).
- `void*` is how C-style APIs like `malloc`, `qsort`, and `pthread_create`
  achieve genericity. In C++, prefer templates.

```cpp
// C-style qsort comparator uses void*
int compare(const void* a, const void* b) {
    int ia = *static_cast<const int*>(a);
    int ib = *static_cast<const int*>(b);
    return ia - ib;
}
```

> **Gotcha:** Casting a `void*` to the wrong type and dereferencing it is
> undefined behavior. The compiler won't catch this -- you're on your own.

---

## 6. nullptr and Null Pointer Safety

C++11 introduced `nullptr` as a type-safe null pointer constant, replacing the
problematic `NULL` and `0`.

```cpp
int* p = nullptr;     // clear intent: this is a null pointer
// int* p = NULL;     // works, but NULL is just a macro for 0
// int* p = 0;        // works, but 0 is an integer literal
```

### Why nullptr matters: overload resolution

```cpp
void process(int n)    { /* handles integer */ }
void process(int* p)   { /* handles pointer */ }

process(0);            // calls process(int) -- 0 is an int literal
process(NULL);         // might call process(int) -- NULL is often defined as 0
process(nullptr);      // calls process(int*) -- unambiguous
```

### std::nullptr_t

`nullptr` has its own type: `std::nullptr_t`. This lets you write overloads that
specifically accept null pointers.

```cpp
#include <cstddef>

void handle(std::nullptr_t) {
    // called only with nullptr
}
```

> **Gotcha:** Dereferencing `nullptr` is undefined behavior, not a guaranteed
> crash. Some platforms will segfault; others might silently corrupt memory.
> Always check before dereferencing raw pointers.

---

## 7. Function Pointers

A function pointer stores the address of a function. The syntax can be
intimidating, but it follows a consistent pattern.

```cpp
// A function
int add(int a, int b) { return a + b; }

// A pointer to a function taking two ints and returning int
int (*fp)(int, int) = &add;   // & is optional: add decays to a pointer
int result = fp(3, 4);        // 7 -- call through pointer (* is also optional)
```

### Readability with typedef / using

```cpp
// typedef style
typedef int (*BinaryOp)(int, int);

// using style (preferred in modern C++)
using BinaryOp = int(*)(int, int);

BinaryOp op = add;
op(10, 20);  // 30
```

### Dispatch tables

Function pointer arrays enable jump-table-style dispatch.

```cpp
int add(int a, int b) { return a + b; }
int sub(int a, int b) { return a - b; }
int mul(int a, int b) { return a * b; }

using Op = int(*)(int, int);
Op ops[] = {add, sub, mul};

int result = ops[0](10, 5);  // 15 (add)
result     = ops[2](10, 5);  // 50 (mul)
```

### Function pointers vs std::function vs lambdas

| Feature             | Function pointer       | `std::function`         | Lambda               |
|---------------------|------------------------|-------------------------|-----------------------|
| Stores              | Free functions only    | Anything callable       | Anonymous closure     |
| Captures state?     | No                     | Yes                     | Yes                   |
| Overhead            | None (raw pointer)     | Heap alloc possible     | None (if not erased)  |
| Type erasure        | No                     | Yes                     | No                    |

```cpp
#include <functional>

// std::function can hold a lambda with captures -- function pointer cannot
int multiplier = 3;
std::function<int(int)> fn = [multiplier](int x) { return x * multiplier; };
fn(10);  // 30

// A captureless lambda can convert to a function pointer
int (*fp)(int) = [](int x) { return x * 2; };
fp(10);  // 20
```

---

## 8. Pointers and Functions

### Pass-by-pointer vs pass-by-reference

Both let a function modify the caller's data. The choice is about semantics.

```cpp
// Pass-by-pointer: explicitly nullable, caller sees & at call site
void increment(int* p) {
    if (p) *p += 1;      // must check for null
}

// Pass-by-reference: cannot be null, cleaner syntax
void increment(int& ref) {
    ref += 1;             // no null check needed
}

int x = 5;
increment(&x);    // pass-by-pointer -- caller sees the & (intent is clear)
increment(x);     // pass-by-reference -- caller doesn't see anything special
```

**When to use a pointer parameter:**
- The argument can legitimately be null (optional input).
- You're interfacing with C code.
- You want the call site to make it visually obvious that the argument may be modified.

**When to use a reference parameter:**
- The argument must always be valid (non-null).
- Cleaner syntax is preferred.

### Returning pointers from functions

Never return a pointer to a local variable -- its memory is freed when the
function returns.

```cpp
// WRONG: dangling pointer
int* bad() {
    int local = 42;
    return &local;     // local is destroyed here -- pointer is dangling
}

// OK: heap-allocated (caller must free)
int* ok_heap() {
    return new int(42);
}

// OK: static lives for the entire program
int* ok_static() {
    static int val = 42;
    return &val;
}
```

---

## 9. Dynamic Memory (new / delete)

`new` allocates on the heap and calls the constructor. `delete` calls the
destructor and frees the memory.

```cpp
// Single object
int* p = new int(42);
delete p;

// Array
int* arr = new int[100];
delete[] arr;            // MUST use delete[] for arrays
```

### Mismatched delete is undefined behavior

```cpp
int* a = new int[10];
delete a;      // UB: should be delete[]

int* b = new int(5);
delete[] b;    // UB: should be delete
```

The compiler won't always warn you. The corruption may be silent.

### Placement new

Constructs an object at a specific memory address without allocating. Useful for
memory pools, allocators, and embedded systems.

```cpp
#include <new>

alignas(int) char buffer[sizeof(int)];
int* p = new (buffer) int(42);   // construct at buffer's address

// No delete -- you manage the memory yourself.
// For non-trivial types, call the destructor explicitly:
// p->~MyClass();
```

### std::nothrow

By default, `new` throws `std::bad_alloc` on failure. The `nothrow` variant
returns `nullptr` instead.

```cpp
#include <new>

int* p = new (std::nothrow) int[1000000000];
if (!p) {
    // allocation failed
}
```

> **Tip:** In modern C++, avoid raw `new`/`delete` entirely. Use smart pointers
> (`unique_ptr`, `shared_ptr`) or containers (`vector`, `string`) that manage
> memory automatically.

---

## 10. Smart Pointers (Modern C++)

Smart pointers (`<memory>`) automate ownership and deallocation via RAII. They
are the primary tool for writing leak-free C++.

### unique_ptr -- exclusive ownership

Only one `unique_ptr` can own a resource at a time. Zero overhead compared to a
raw pointer (no reference count, no extra allocation).

```cpp
#include <memory>

auto p = std::make_unique<int>(42);   // preferred over new
// std::unique_ptr<int> p(new int(42));  // also works

*p = 100;

// Transfer ownership -- p becomes null
auto q = std::move(p);
// p is now nullptr, q owns the resource

// Automatically deleted when q goes out of scope
```

For arrays:

```cpp
auto arr = std::make_unique<int[]>(100);  // array of 100 ints
arr[0] = 42;
```

### shared_ptr -- reference-counted shared ownership

Multiple `shared_ptr` instances can share the same resource. The resource is
freed when the last `shared_ptr` is destroyed.

```cpp
auto p1 = std::make_shared<int>(42);
auto p2 = p1;   // reference count is now 2

p1.reset();      // count drops to 1
// resource freed when p2 is destroyed (count drops to 0)

p2.use_count();  // 1
```

> **Gotcha:** `make_shared` performs a single allocation for both the control
> block and the object. `shared_ptr<T>(new T(...))` does two allocations and is
> not exception-safe if used in a function argument.

### weak_ptr -- non-owning observer

`weak_ptr` observes a `shared_ptr` without affecting the reference count. It
breaks circular references that would otherwise leak memory.

```cpp
std::shared_ptr<int> strong = std::make_shared<int>(42);
std::weak_ptr<int> weak = strong;

// Must lock() to get a shared_ptr before accessing
if (auto sp = weak.lock()) {
    // resource is alive, sp keeps it alive while in scope
    int val = *sp;
}

strong.reset();           // resource is freed
weak.expired();           // true
weak.lock();              // returns empty shared_ptr
```

### Circular reference problem

```cpp
struct Node {
    std::shared_ptr<Node> next;   // creates a cycle if two nodes point to each other
    // std::weak_ptr<Node> next;  // fix: use weak_ptr for back-references
};

auto a = std::make_shared<Node>();
auto b = std::make_shared<Node>();
a->next = b;
b->next = a;  // circular reference -- neither is ever freed with shared_ptr
```

### Custom deleters

```cpp
// For resources that aren't allocated with new (e.g., FILE*, C handles)
auto file = std::unique_ptr<FILE, decltype(&fclose)>(
    fopen("data.txt", "r"), &fclose
);

// shared_ptr: deleter doesn't affect the type
std::shared_ptr<FILE> f(fopen("data.txt", "r"), fclose);
```

### enable_shared_from_this

Lets an object that's already managed by `shared_ptr` safely create additional
`shared_ptr` instances to itself.

```cpp
struct Widget : std::enable_shared_from_this<Widget> {
    std::shared_ptr<Widget> get_self() {
        return shared_from_this();  // safe
        // return std::shared_ptr<Widget>(this);  // WRONG: double-free
    }
};

auto w = std::make_shared<Widget>();
auto w2 = w->get_self();  // same control block, correct ref count
```

### Which smart pointer should I use?

```
Does more than one owner need the resource?
  |
  +-- No  --> unique_ptr
  |
  +-- Yes --> Do you have circular references?
                |
                +-- No  --> shared_ptr
                |
                +-- Yes --> shared_ptr for "owning" direction,
                            weak_ptr for "back" references
```

---

## 11. Pointer Casting

C++ provides four named casts. Each serves a specific purpose and is safer than
the C-style `(Type*)` cast because the compiler enforces restrictions.

### static_cast

The most common cast. Performs well-defined conversions between related types.
No runtime check.

```cpp
// Numeric conversions
double d = 3.14;
int n = static_cast<int>(d);   // 3 (truncates)

// Upcasting (derived -> base) is implicit, but downcast needs static_cast
struct Base { virtual ~Base() = default; };
struct Derived : Base { int data = 0; };

Base* bp = new Derived();
Derived* dp = static_cast<Derived*>(bp);  // OK if bp actually points to Derived

// void* round-trip
void* vp = static_cast<void*>(&n);
int* ip = static_cast<int*>(vp);
```

### dynamic_cast

Runtime-checked downcasting for polymorphic types (those with at least one
virtual function). Requires RTTI.

```cpp
Base* bp = get_some_base_ptr();

Derived* dp = dynamic_cast<Derived*>(bp);
if (dp) {
    // bp actually pointed to a Derived (or subclass of Derived)
} else {
    // bp did not point to a Derived
}

// With references: throws std::bad_cast on failure instead of returning null
try {
    Derived& dr = dynamic_cast<Derived&>(*bp);
} catch (std::bad_cast&) {
    // not a Derived
}
```

### reinterpret_cast

Reinterprets the bit pattern. Almost no type checking. Use only when you know
exactly what you're doing (e.g., low-level serialization, hardware registers).

```cpp
int n = 42;
// Treat the int's address as a char* to inspect its bytes
char* bytes = reinterpret_cast<char*>(&n);
for (size_t i = 0; i < sizeof(int); i++)
    std::cout << static_cast<int>(bytes[i]) << " ";

// Pointer-to-integer round-trip (platform-specific)
uintptr_t addr = reinterpret_cast<uintptr_t>(&n);
int* p = reinterpret_cast<int*>(addr);
```

### const_cast

Adds or removes `const` (or `volatile`). The only cast that can do this.

```cpp
const int x = 42;
int* p = const_cast<int*>(&x);
// *p = 100;   // compiles, but UNDEFINED BEHAVIOR if x was originally const

// Legitimate use: calling a non-const API with data you know is safe to modify
void legacy_api(char* s);  // C function that doesn't modify s

const std::string& str = "hello";
legacy_api(const_cast<char*>(str.c_str()));
```

### Why avoid C-style casts

A C-style cast `(Type*)ptr` silently picks whichever of the four named casts is
needed -- including `reinterpret_cast`. It's impossible to search for in code
and hides dangerous conversions.

```cpp
// This compiles silently but is reinterpret_cast under the hood
int n = 42;
double* dp = (double*)&n;   // type-punning, likely UB
// With named casts, you'd have to write reinterpret_cast, making the danger visible.
```

---

## 12. The this Pointer

Inside a non-static member function, `this` is an implicit pointer to the
object the function was called on. You never declare it -- the compiler injects
it.

```cpp
struct Counter {
    int count = 0;

    // 'this' has type Counter* (or const Counter* in a const method)
    Counter& increment() {
        this->count++;   // explicit use of this (usually unnecessary)
        count++;         // same thing -- 'this->' is implied
        return *this;    // return the object by reference for chaining
    }

    void print() const {
        // 'this' is const Counter* here -- can't modify members
        std::cout << count << "\n";
    }
};

Counter c;
c.increment().increment().increment();  // chaining via return *this
c.print();  // 3
```

### When you need this explicitly

- **Method chaining:** return `*this`.
- **Disambiguation:** when a parameter shadows a member name.
- **Passing self:** `someFunction(this)` or `shared_from_this()`.

### Deleting this

Legal but extremely dangerous. The object must have been heap-allocated with
`new`, and you must not touch any members after the `delete`.

```cpp
struct SelfDestruct {
    void destroy() {
        delete this;
        // don't access any members after this line
    }
};

auto* s = new SelfDestruct();
s->destroy();
// s is now dangling -- don't use it
```

---

## 13. Pointers to Class Members

C++ has a special pointer type that points to a member of a class (not a
specific object's member, but the member itself). These require the `.*` and
`->*` operators to dereference.

### Pointer to data member

```cpp
struct Point {
    int x, y;
};

// Pointer to an int member of Point
int Point::*pm = &Point::x;

Point pt{10, 20};
Point* pp = &pt;

pt.*pm;     // 10  -- access x through the member pointer
pp->*pm;    // 10  -- same, through an object pointer

pm = &Point::y;
pt.*pm;     // 20  -- now accessing y
```

### Pointer to member function

```cpp
struct Calculator {
    int add(int a, int b) { return a + b; }
    int sub(int a, int b) { return a - b; }
};

// Pointer to a member function of Calculator that takes two ints
int (Calculator::*pmf)(int, int) = &Calculator::add;

Calculator calc;
Calculator* cp = &calc;

(calc.*pmf)(3, 4);    // 7
(cp->*pmf)(3, 4);     // 7

pmf = &Calculator::sub;
(calc.*pmf)(10, 3);   // 7
```

### Simplifying with std::invoke (C++17)

`std::invoke` provides a uniform interface to call any callable, including
member pointers.

```cpp
#include <functional>

struct Point { int x, y; };

Point pt{10, 20};
int val = std::invoke(&Point::x, pt);  // 10 -- much cleaner than .*
```

---

## 14. Iterators as Generalized Pointers

STL iterators model the pointer interface. Random-access iterators (like those
of `vector` and `deque`) support all pointer-like operations: `*`, `++`, `--`,
`+`, `-`, `[]`, and comparison.

```cpp
#include <vector>
#include <algorithm>

std::vector<int> v = {5, 3, 1, 4, 2};

// Iterators behave like pointers
auto it = v.begin();   // points to v[0]
*it = 10;              // modify the element
it += 3;               // jump to v[3]
int val = it[-1];      // v[2] -- random access

// Algorithms accept iterator ranges, just like pointer ranges
std::sort(v.begin(), v.end());
```

### vector::iterator may literally be a pointer

Many standard library implementations define `vector<T>::iterator` as `T*`
in release mode. Debug mode uses a wrapper class that adds bounds checking.

```cpp
// This often compiles because vector iterators are raw pointers internally
std::vector<int> v = {1, 2, 3};
int* raw = &v[0];         // legal: vector is contiguous
int* also = v.data();     // preferred way to get the raw pointer
```

### Iterator invalidation

Modifying a container can invalidate existing iterators, making them dangling.
Key rules:

| Container         | Invalidated by                                          |
|-------------------|---------------------------------------------------------|
| `vector`          | Any insertion/deletion (reallocation may move all data) |
| `deque`           | Insert/erase at front or back invalidates all iterators |
| `list` / `set` / `map` | Only the erased element's iterator is invalidated  |
| `unordered_map`   | Rehash (triggered by insert when load factor exceeded)  |

> **Gotcha:** Erasing from a vector while iterating with index-based loops
> works, but with iterator loops you must use the return value of `erase()`:
> `it = v.erase(it);`

---

## 15. Common Pitfalls and Undefined Behavior

### Dangling pointer (use-after-free)

```cpp
int* p = new int(42);
delete p;
*p = 10;   // UB: p points to freed memory
```

After `delete`, set the pointer to `nullptr` (or better, use a smart pointer
so you never call `delete` manually).

### Wild / uninitialized pointer

```cpp
int* p;      // uninitialized -- contains garbage address
*p = 10;     // UB: writing to an arbitrary memory location
```

Always initialize pointers: `int* p = nullptr;`

### Double free

```cpp
int* p = new int(42);
delete p;
delete p;    // UB: freeing the same memory twice
```

This can corrupt the heap allocator's internal data structures.

### Memory leak

```cpp
void leak() {
    int* p = new int(42);
    // function returns without delete -- memory is leaked
}
```

Leaked memory is never returned to the OS (until the process exits). In
long-running programs, this causes unbounded memory growth.

### Buffer overflow via pointer arithmetic

```cpp
int arr[5] = {1, 2, 3, 4, 5};
int* p = arr + 10;   // past the end
*p = 99;             // UB: writing outside array bounds
```

### Strict aliasing rule

The compiler assumes that pointers of unrelated types don't alias the same
memory. Violating this allows the optimizer to produce incorrect code.

```cpp
float f = 3.14f;

// WRONG: violates strict aliasing
int n = *reinterpret_cast<int*>(&f);

// Correct: use memcpy for type punning
int n2;
std::memcpy(&n2, &f, sizeof(n2));

// C++20: use std::bit_cast
// int n3 = std::bit_cast<int>(f);
```

`char*`, `unsigned char*`, and `std::byte*` are exempt from the strict aliasing
rule -- they can alias any type.

### delete vs delete[] mismatch

```cpp
int* a = new int[10];
delete a;       // UB: must use delete[]

std::string* s = new std::string("hi");
delete[] s;     // UB: must use delete (not delete[])
```

The mismatch corrupts the allocator's bookkeeping. It may appear to "work"
and then crash much later, making it notoriously hard to debug.

---

## 16. Best Practices Summary

**Prefer references over raw pointers** when the target must always be valid
(non-null). References can't be reseated and can't be null, eliminating two
classes of bugs.

**Prefer smart pointers over raw new/delete.** `unique_ptr` is the default
choice. Use `shared_ptr` only when you genuinely have shared ownership.

**Use const pointers wherever possible.** `const` at the pointer level
(`int* const`) and/or data level (`const int*`) communicates intent and catches
mistakes at compile time.

**Check raw pointers for null before dereferencing.** If a function accepts a
raw pointer, it's conventional to assume it might be null.

**RAII over manual memory management.** Every resource (memory, files, locks,
sockets) should be owned by an object whose destructor releases it. Smart
pointers and containers implement this pattern.

**Avoid C-style casts.** Use `static_cast`, `dynamic_cast`, `reinterpret_cast`,
or `const_cast` explicitly. They're searchable, self-documenting, and
compiler-checked.

**Don't use `void*` in C++ code.** Use templates for genericity. Reserve
`void*` for C interop boundaries.

**Never return pointers or references to local variables.** Their lifetime ends
when the function returns. Return by value, or allocate on the heap and return
a smart pointer.

**Use `nullptr`, not `NULL` or `0`.** It's type-safe and avoids ambiguity in
overload resolution.

**Treat pointer arithmetic as array arithmetic only.** Pointer arithmetic is
defined only within arrays (including one-past-end). Arbitrary address math is
undefined behavior.
