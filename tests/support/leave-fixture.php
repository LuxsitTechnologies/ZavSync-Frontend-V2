<?php

// Synthetic data, restricted to the disposable frontend verification database.
require getcwd().'/vendor/autoload.php';
$app = require getcwd().'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$databasePath = getenv('ZAVSYNC_E2E_DB') ?: '/tmp/zavsync-stage14-e2e.sqlite';
if (! app()->environment('testing') || config('database.default') !== 'sqlite'
    || config('database.connections.sqlite.database') !== $databasePath
    || ! preg_match('#^/tmp/zavsync-(?:stage14-e2e\.sqlite|attendance-e2e-[A-Za-z0-9._-]+)$#', $databasePath)) {
    throw new RuntimeException('Leave fixture requires a disposable E2E SQLite database.');
}
$user = App\Models\User::factory()->create(['name' => 'Leave Tester', 'email' => 'leave@example.invalid']);
$admin = App\Models\User::factory()->create(['name' => 'Leave Reviewer', 'email' => 'leave-admin@example.invalid']);
$denied = App\Models\User::factory()->create(['name' => 'No Leave Access', 'email' => 'leave-denied@example.invalid']);
foreach (['A', 'B', 'C'] as $letter) {
    $company = App\Models\Company::factory()->create(['name' => 'Leave Company '.$letter, 'timezone' => 'Asia/Karachi']);
    foreach (['employee' => $user, 'admin' => $admin, 'denied' => $denied] as $kind => $actor) {
        $role = App\Models\Role::factory()->for($company)->create(['name' => 'Leave '.$kind]);
        $permissions = match ($kind) {
            'employee' => ['employee.self.view', 'employee.leave.view', 'employee.leave.request', 'employee.leave.cancel'],
            'admin' => ['leave.view', 'leave.approve', 'leave.manage', 'holiday.view', 'holiday.manage'],
            default => ['employee.self.view'],
        };
        foreach ($permissions as $name) {
            $role->permissions()->attach(App\Models\Permission::query()->firstOrCreate(['name' => $name]));
        }
        $membership = App\Models\CompanyUser::query()->create(['company_id' => $company->id, 'user_id' => $actor->id, 'role_id' => $role->id, 'is_active' => true]);
        $employee = App\Models\Employee::factory()->for($company)->create(['created_by' => $actor->id, 'status' => $letter === 'B' ? 'resigned' : 'active']);
        if ($letter !== 'C') {
            $membership->forceFill(['employee_id' => $employee->id])->save();
        }
        if ($kind === 'employee') {
            $type = App\Models\LeaveType::query()->create(['company_id' => $company->id, 'name' => 'Certified Rest', 'is_paid' => true]);
            App\Models\LeaveEntitlement::query()->create(['company_id' => $company->id, 'employee_id' => $employee->id, 'leave_type_id' => $type->id, 'year' => now()->addDays(10)->year, 'allocated_units' => 20, 'created_by' => $admin->id]);
            if ($letter === 'B') {
                App\Models\LeaveRequest::factory()->create(['company_id' => $company->id, 'employee_id' => $employee->id, 'leave_type_id' => $type->id, 'submitted_by' => $actor->id, 'status' => 'APPROVED']);
            }
        } elseif ($kind === 'admin' && $letter === 'A') {
            App\Models\LeaveRequest::factory()->create(['company_id' => $company->id, 'employee_id' => $employee->id, 'submitted_by' => $actor->id, 'reason' => 'Administrator own request']);
        }
    }
    App\Models\CompanyHoliday::query()->create(['company_id' => $company->id, 'name' => 'Local Day '.$letter, 'date' => now()->addDays(10)->toDateString(), 'description' => 'Synthetic holiday', 'created_by' => $admin->id]);
}
