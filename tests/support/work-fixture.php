<?php

// Synthetic data, restricted to the disposable frontend verification database.
require getcwd().'/vendor/autoload.php';
$app = require getcwd().'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$databasePath = getenv('ZAVSYNC_E2E_DB') ?: '/tmp/zavsync-stage14-e2e.sqlite';
if (! app()->environment('testing') || config('database.default') !== 'sqlite'
    || config('database.connections.sqlite.database') !== $databasePath
    || ! preg_match('#^/tmp/zavsync-(?:stage14-e2e\.sqlite|attendance-e2e-[A-Za-z0-9._-]+)$#', $databasePath)) {
    throw new RuntimeException('Work fixture requires a disposable E2E SQLite database.');
}
$user = App\Models\User::factory()->create(['name' => 'Work Employee', 'email' => 'work@example.invalid']);
$admin = App\Models\User::factory()->create(['name' => 'Work Administrator', 'email' => 'work-admin@example.invalid']);
$denied = App\Models\User::factory()->create(['email' => 'work-denied@example.invalid', 'is_platform_admin' => true]);
foreach (['A', 'B', 'C'] as $letter) {
    $company = App\Models\Company::factory()->create(['name' => 'Work Company '.$letter, 'timezone' => 'Asia/Karachi']);
    foreach (['employee' => $user, 'admin' => $admin, 'denied' => $denied] as $kind => $actor) {
        $role = App\Models\Role::factory()->for($company)->create(['name' => 'Work '.$kind]);
        $permissions = match ($kind) {
            'employee' => ['employee.self.view', 'employee.tasks.view', 'employee.tasks.update', 'employee.tasks.comment', 'employee.tickets.view', 'employee.tickets.create', 'employee.tickets.comment'],
            'admin' => ['tasks.view', 'tasks.manage', 'tasks.assign', 'tickets.view', 'tickets.manage'],
            default => ['employee.self.view'],
        };
        foreach ($permissions as $name) {
            $role->permissions()->attach(App\Models\Permission::query()->firstOrCreate(['name' => $name]));
        }
        $membership = App\Models\CompanyUser::query()->create(['company_id' => $company->id, 'user_id' => $actor->id, 'role_id' => $role->id, 'is_active' => true]);
        if ($kind === 'employee') {
            $employee = App\Models\Employee::factory()->for($company)->create(['created_by' => $actor->id, 'full_name' => 'Work Employee '.$letter, 'status' => $letter === 'B' ? 'terminated' : 'active']);
            if ($letter !== 'C') {
                $membership->forceFill(['employee_id' => $employee->id])->save();
            }
            App\Models\EmployeeTask::factory()->create(['company_id' => $company->id, 'assigned_employee_id' => $employee->id, 'created_by' => $admin->id, 'title' => 'Certified Task '.$letter, 'status' => 'ASSIGNED']);
            App\Models\EmployeeTicket::factory()->create(['company_id' => $company->id, 'employee_id' => $employee->id, 'created_by' => $actor->id, 'subject' => 'Certified Ticket '.$letter, 'status' => 'OPEN']);
        }
    }
}
